import deployedContracts from "../../contracts/deployedContracts";
import { PostgreSQLStore } from "../database/postgreSQLStore";
import { Log, createPublicClient, decodeEventLog, http, parseAbiItem } from "viem";
import { foundry } from "viem/chains";

interface ProcessedEvent {
  type: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: any;
}

export class ChainMonitor {
  private client;
  private contractAddress;
  private postgresqlStore: PostgreSQLStore;
  private isMonitoring = false;

  constructor() {
    this.client = createPublicClient({
      chain: foundry,
      transport: http(),
    });

    const contract = deployedContracts[31337]?.StoryChain;
    if (!contract) {
      throw new Error("StoryChain contract not found in deployed contracts");
    }

    this.contractAddress = contract.address as `0x${string}`;
    this.postgresqlStore = new PostgreSQLStore();
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      console.log("监控已在运行中");
      return;
    }

    this.isMonitoring = true;
    console.log("开始监控链上数据...");

    try {
      // 获取最新数据的起始块
      const lastUpdate = await this.postgresqlStore.getLastUpdateInfo();
      const startBlock = lastUpdate ? BigInt(lastUpdate.block + 1) : undefined;

      await this.syncHistoricalData(startBlock);
      this.startRealtimeMonitoring();
    } catch (error) {
      console.error("启动监控失败:", error);
      this.isMonitoring = false;
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log("停止监控链上数据");
  }

  async syncHistoricalData(fromBlock?: bigint) {
    const startBlock = fromBlock || 0n; // 确保首次同步从区块0开始
    const currentBlock = await this.client.getBlockNumber();

    if (fromBlock) {
      console.log(`增量同步: 从区块 ${startBlock} 到 ${currentBlock}`);
    } else {
      console.log(`全量同步: 从创世区块(${startBlock}) 到 ${currentBlock}`);
    }

    try {
      // 获取所有相关事件日志（不指定events参数，让processEvents来解析）
      console.log(`正在获取区块范围 ${startBlock} - ${currentBlock} 的事件日志...`);

      const events = await this.client.getLogs({
        address: this.contractAddress,
        fromBlock: startBlock,
        toBlock: currentBlock,
      });

      console.log(`从区块 ${startBlock} 到 ${currentBlock} 获取到 ${events.length} 个原始日志`);

      if (events.length > 0) {
        console.log(`开始解析 ${events.length} 个日志...`);
        const processedEvents = await this.processEvents(events);
        console.log(`成功解析出 ${processedEvents.length} 个有效事件`);

        if (processedEvents.length > 0) {
          await this.updateEdgeConfig(processedEvents, Number(currentBlock));
          console.log(`✅ 成功同步 ${processedEvents.length} 个事件到数据库`);
        } else {
          console.log("⚠️  没有解析出任何有效事件");
        }
      } else {
        console.log("没有新事件需要同步");
        // 即使没有事件，也要更新同步状态
        await this.postgresqlStore.updateDataIncremental({
          lastUpdateBlock: Number(currentBlock),
          lastUpdateTime: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("同步历史数据失败:", error);
      console.error("错误详情:", {
        contractAddress: this.contractAddress,
        startBlock: startBlock.toString(),
        currentBlock: currentBlock.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private startRealtimeMonitoring() {
    console.log("开始实时监控...");

    // 使用watchBlocks来监控新区块，然后手动获取事件
    const unwatch = this.client.watchBlocks({
      onBlock: async block => {
        try {
          // 获取该区块的所有合约事件
          const logs = await this.client.getLogs({
            address: this.contractAddress,
            fromBlock: block.number,
            toBlock: block.number,
          });

          if (logs.length > 0) {
            console.log(`区块 ${block.number} 中发现 ${logs.length} 个合约事件`);
            const processedEvents = await this.processEvents(logs);
            await this.updateEdgeConfig(processedEvents, Number(block.number));
            console.log(`✅ 实时处理了 ${processedEvents.length} 个有效事件`);
          }
        } catch (error) {
          console.error(`处理区块 ${block.number} 的事件时出错:`, error);
        }
      },
    });

    // 定期检查（防止丢失事件）
    const interval = setInterval(
      async () => {
        if (!this.isMonitoring) {
          clearInterval(interval);
          unwatch();
          return;
        }

        try {
          const lastUpdate = await this.postgresqlStore.getLastUpdateInfo();
          const startBlock = lastUpdate ? BigInt(lastUpdate.block + 1) : 0n;
          await this.syncHistoricalData(startBlock);
        } catch (error) {
          console.error("定期同步失败:", error);
        }
      },
      parseInt(process.env.MONITORING_INTERVAL_MS || "30000"),
    );
  }

  private getEventAbis() {
    return [
      parseAbiItem("event StoryCreated(uint256 indexed storyId, address indexed author, string ipfsHash)"),
      parseAbiItem(
        "event ChapterCreated(uint256 indexed storyId, uint256 indexed chapterId, uint256 parentId, address indexed author, string ipfsHash)",
      ),
      parseAbiItem(
        "event ChapterForked(uint256 indexed storyId, uint256 indexed chapterId, uint256 parentId, address indexed author, string ipfsHash)",
      ),
      parseAbiItem("event StoryLiked(uint256 indexed storyId, address indexed liker, uint256 newLikeCount)"),
      parseAbiItem("event ChapterLiked(uint256 indexed chapterId, address indexed liker, uint256 newLikeCount)"),
      parseAbiItem(
        "event tipSent(uint256 indexed storyId, uint256 indexed chapterId, address indexed tipper, uint256 amount)",
      ),
    ];
  }

  private async processEvents(logs: Log[]): Promise<ProcessedEvent[]> {
    const processedEvents: ProcessedEvent[] = [];
    const eventAbis = this.getEventAbis();

    for (const log of logs) {
      try {
        // 获取区块信息以获取时间戳
        const block = await this.client.getBlock({ blockNumber: log.blockNumber || undefined });
        const timestamp = Number(block.timestamp);

        // 尝试解析每个可能的事件类型
        let eventName = "unknown";
        let eventArgs: any = null;

        for (const eventAbi of eventAbis) {
          try {
            const decoded = decodeEventLog({
              abi: [eventAbi],
              data: log.data,
              topics: log.topics,
            });

            eventName = decoded.eventName;
            eventArgs = decoded.args;
            break;
          } catch {
            // 继续尝试下一个事件ABI
            continue;
          }
        }

        const processedEvent: ProcessedEvent = {
          type: eventName,
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash || "",
          timestamp,
          data: eventArgs,
        };

        processedEvents.push(processedEvent);
        console.log(`处理事件: ${eventName}, 区块: ${processedEvent.blockNumber}`);
      } catch (error) {
        console.error("处理事件失败:", error);
        console.error("日志详情:", log);
      }
    }

    return processedEvents;
  }

  private async updateEdgeConfig(events: ProcessedEvent[], latestBlock: number) {
    try {
      console.log(`处理 ${events.length} 个事件...`);

      // 直接处理每个事件，避免加载全量数据到内存
      for (const event of events) {
        await this.postgresqlStore.processEventDirectly(
          event.type,
          event.data,
          event.blockNumber,
          event.transactionHash,
          event.timestamp,
        );
      }

      // 直接在数据库计算分析数据，避免加载全量数据
      const analytics = await this.postgresqlStore.calculateAnalyticsDirect();

      // 更新同步状态
      await this.postgresqlStore.updateDataIncremental({
        analytics,
        lastUpdateBlock: latestBlock,
        lastUpdateTime: new Date().toISOString(),
      });

      console.log(`✅ 成功处理 ${events.length} 个事件，内存使用优化`);
    } catch (error) {
      console.error("事件处理失败:", error);
    }
  }

  async getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      contractAddress: this.contractAddress,
      lastUpdate: await this.postgresqlStore.getLastUpdateInfo(),
    };
  }

  // 测试方法：暴露processEvents用于诊断
  async processEventsForDiagnosis(logs: any[]) {
    return await this.processEvents(logs);
  }

  // 测试方法：暴露client用于诊断
  getClientForDiagnosis() {
    return this.client;
  }
}
