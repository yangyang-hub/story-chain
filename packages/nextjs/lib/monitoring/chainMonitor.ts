import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { foundry } from 'viem/chains';
import deployedContracts from '../../contracts/deployedContracts';
import { EdgeConfigStore, StoryData, ChapterData, AnalyticsData } from './edgeConfigStore';

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
  private contractAbi;
  private edgeStore: EdgeConfigStore;
  private isMonitoring = false;

  constructor() {
    this.client = createPublicClient({
      chain: foundry,
      transport: http()
    });
    
    const contract = deployedContracts[31337]?.StoryChain;
    if (!contract) {
      throw new Error('StoryChain contract not found in deployed contracts');
    }
    
    this.contractAddress = contract.address as `0x${string}`;
    this.contractAbi = contract.abi;
    this.edgeStore = new EdgeConfigStore();
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    console.log('开始监控链上数据...');

    try {
      // 获取最新数据的起始块
      const lastUpdate = await this.edgeStore.getLastUpdateInfo();
      const startBlock = lastUpdate ? BigInt(lastUpdate.block + 1) : undefined;

      await this.syncHistoricalData(startBlock);
      this.startRealtimeMonitoring();
    } catch (error) {
      console.error('启动监控失败:', error);
      this.isMonitoring = false;
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('停止监控链上数据');
  }

  private async syncHistoricalData(fromBlock?: bigint) {
    console.log('同步历史数据...');
    
    try {
      const currentBlock = await this.client.getBlockNumber();
      const startBlock = fromBlock || currentBlock - BigInt(process.env.BLOCKS_RANGE || 1000);

      // 监听所有相关事件
      const events = await this.client.getLogs({
        address: this.contractAddress,
        events: this.getEventAbis(),
        fromBlock: startBlock,
        toBlock: currentBlock
      });

      if (events.length > 0) {
        const processedEvents = await this.processEvents(events);
        await this.updateEdgeConfig(processedEvents, Number(currentBlock));
        console.log(`同步了 ${events.length} 个事件`);
      }
    } catch (error) {
      console.error('同步历史数据失败:', error);
    }
  }

  private startRealtimeMonitoring() {
    console.log('开始实时监控...');
    
    // 监听新事件
    const unwatch = this.client.watchEvent({
      address: this.contractAddress,
      events: this.getEventAbis(),
      onLogs: async (logs) => {
        if (logs.length > 0) {
          const processedEvents = await this.processEvents(logs);
          const latestBlock = Math.max(...logs.map(log => Number(log.blockNumber)));
          await this.updateEdgeConfig(processedEvents, latestBlock);
          console.log(`处理了 ${logs.length} 个新事件`);
        }
      },
    });

    // 定期检查（防止丢失事件）
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        unwatch?.();
        return;
      }
      
      try {
        await this.syncHistoricalData();
      } catch (error) {
        console.error('定期同步失败:', error);
      }
    }, parseInt(process.env.MONITORING_INTERVAL_MS || '30000'));
  }

  private getEventAbis() {
    return [
      parseAbiItem('event StoryCreated(uint256 indexed storyId, address indexed author, string ipfsHash)'),
      parseAbiItem('event ChapterCreated(uint256 indexed storyId, uint256 indexed chapterId, uint256 parentId, address indexed author, string ipfsHash)'),
      parseAbiItem('event ChapterForked(uint256 indexed storyId, uint256 indexed chapterId, uint256 parentId, address indexed author, string ipfsHash)'),
      parseAbiItem('event StoryLiked(uint256 indexed storyId, address indexed liker, uint256 newLikeCount)'),
      parseAbiItem('event ChapterLiked(uint256 indexed chapterId, address indexed liker, uint256 newLikeCount)'),
      parseAbiItem('event tipSent(uint256 indexed storyId, uint256 indexed chapterId, address indexed tipper, uint256 amount)')
    ];
  }

  private async processEvents(logs: Log[]): Promise<ProcessedEvent[]> {
    const processedEvents: ProcessedEvent[] = [];
    
    for (const log of logs) {
      try {
        // 获取区块信息以获取时间戳
        const block = await this.client.getBlock({ blockNumber: log.blockNumber });
        const timestamp = Number(block.timestamp);

        const processedEvent: ProcessedEvent = {
          type: log.eventName || 'unknown',
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp,
          data: log.args
        };

        processedEvents.push(processedEvent);
      } catch (error) {
        console.error('处理事件失败:', error);
      }
    }

    return processedEvents;
  }

  private async updateEdgeConfig(events: ProcessedEvent[], latestBlock: number) {
    try {
      // 获取当前存储的数据
      const currentData = await this.edgeStore.getData();
      
      const stories: StoryData[] = currentData?.stories || [];
      const chapters: ChapterData[] = currentData?.chapters || [];
      
      // 处理事件并更新数据
      for (const event of events) {
        switch (event.type) {
          case 'StoryCreated':
            await this.handleStoryCreated(event, stories);
            break;
          case 'ChapterCreated':
          case 'ChapterForked':
            await this.handleChapterCreated(event, chapters);
            break;
          case 'StoryLiked':
            this.handleStoryLiked(event, stories);
            break;
          case 'ChapterLiked':
            this.handleChapterLiked(event, chapters);
            break;
          case 'tipSent':
            this.handleTipSent(event, stories, chapters);
            break;
        }
      }

      // 计算分析数据
      const analytics = this.calculateAnalytics(stories, chapters, events);

      // 更新 Edge Config
      await this.edgeStore.updateData({
        stories,
        chapters,
        analytics,
        lastUpdateBlock: latestBlock,
        lastUpdateTime: new Date().toISOString()
      });

    } catch (error) {
      console.error('更新 Edge Config 失败:', error);
    }
  }

  private async handleStoryCreated(event: ProcessedEvent, stories: StoryData[]) {
    const { storyId, author, ipfsHash } = event.data;
    
    // 检查是否已存在
    if (stories.find(s => s.id === storyId.toString())) {
      return;
    }

    const storyData: StoryData = {
      id: storyId.toString(),
      author: author.toLowerCase(),
      ipfsHash,
      createdTime: event.timestamp,
      likes: 0,
      forkCount: 0,
      totalTips: '0',
      totalTipCount: 0,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };

    stories.push(storyData);
  }

  private async handleChapterCreated(event: ProcessedEvent, chapters: ChapterData[]) {
    const { storyId, chapterId, parentId, author, ipfsHash } = event.data;
    
    // 检查是否已存在
    if (chapters.find(c => c.id === chapterId.toString())) {
      return;
    }

    // 获取章节详细信息
    try {
      const chapterInfo = await this.client.readContract({
        address: this.contractAddress,
        abi: this.contractAbi,
        functionName: 'getChapter',
        args: [chapterId]
      });

      const chapterData: ChapterData = {
        id: chapterId.toString(),
        storyId: storyId.toString(),
        parentId: parentId.toString(),
        author: author.toLowerCase(),
        ipfsHash,
        createdTime: event.timestamp,
        likes: 0,
        forkCount: 0,
        chapterNumber: Number(chapterInfo.chapterNumber),
        totalTips: '0',
        totalTipCount: 0,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };

      chapters.push(chapterData);
    } catch (error) {
      console.error('获取章节信息失败:', error);
    }
  }

  private handleStoryLiked(event: ProcessedEvent, stories: StoryData[]) {
    const { storyId, newLikeCount } = event.data;
    const story = stories.find(s => s.id === storyId.toString());
    if (story) {
      story.likes = Number(newLikeCount);
    }
  }

  private handleChapterLiked(event: ProcessedEvent, chapters: ChapterData[]) {
    const { chapterId, newLikeCount } = event.data;
    const chapter = chapters.find(c => c.id === chapterId.toString());
    if (chapter) {
      chapter.likes = Number(newLikeCount);
    }
  }

  private handleTipSent(event: ProcessedEvent, stories: StoryData[], chapters: ChapterData[]) {
    const { storyId, chapterId, amount } = event.data;
    
    const story = stories.find(s => s.id === storyId.toString());
    if (story) {
      story.totalTips = (BigInt(story.totalTips) + BigInt(amount)).toString();
      story.totalTipCount += 1;
    }

    const chapter = chapters.find(c => c.id === chapterId.toString());
    if (chapter) {
      chapter.totalTips = (BigInt(chapter.totalTips) + BigInt(amount)).toString();
      chapter.totalTipCount += 1;
    }
  }

  private calculateAnalytics(
    stories: StoryData[], 
    chapters: ChapterData[], 
    recentEvents: ProcessedEvent[]
  ): AnalyticsData {
    const totalLikes = stories.reduce((sum, s) => sum + s.likes, 0) + 
                      chapters.reduce((sum, c) => sum + c.likes, 0);
    
    const totalTips = stories.reduce((sum, s) => sum + BigInt(s.totalTips), BigInt(0)) + 
                     chapters.reduce((sum, c) => sum + BigInt(c.totalTips), BigInt(0));

    const authors = new Set([...stories.map(s => s.author), ...chapters.map(c => c.author)]);
    
    // 找出最受欢迎的故事
    const mostLikedStory = stories.reduce((prev, current) => 
      current.likes > prev.likes ? current : prev, stories[0]);
    
    const mostForkedStory = stories.reduce((prev, current) => 
      current.forkCount > prev.forkCount ? current : prev, stories[0]);

    // 计算顶级作者
    const authorStats = new Map<string, {storyCount: number, chapterCount: number, totalEarnings: bigint}>();
    
    stories.forEach(story => {
      const stats = authorStats.get(story.author) || {storyCount: 0, chapterCount: 0, totalEarnings: BigInt(0)};
      stats.storyCount++;
      stats.totalEarnings += BigInt(story.totalTips);
      authorStats.set(story.author, stats);
    });

    chapters.forEach(chapter => {
      const stats = authorStats.get(chapter.author) || {storyCount: 0, chapterCount: 0, totalEarnings: BigInt(0)};
      stats.chapterCount++;
      stats.totalEarnings += BigInt(chapter.totalTips);
      authorStats.set(chapter.author, stats);
    });

    const topAuthors = Array.from(authorStats.entries())
      .sort((a, b) => Number(b[1].totalEarnings - a[1].totalEarnings))
      .slice(0, 10)
      .map(([address, stats]) => ({
        address,
        storyCount: stats.storyCount,
        chapterCount: stats.chapterCount,
        totalEarnings: stats.totalEarnings.toString()
      }));

    return {
      totalStories: stories.length,
      totalChapters: chapters.length,
      totalAuthors: authors.size,
      totalLikes,
      totalTips: totalTips.toString(),
      mostLikedStoryId: mostLikedStory?.id,
      mostForkedStoryId: mostForkedStory?.id,
      topAuthors,
      recentActivity: recentEvents.slice(-50).map(event => ({
        type: event.type as any,
        timestamp: event.timestamp,
        data: event.data
      }))
    };
  }

  async getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      contractAddress: this.contractAddress,
      lastUpdate: await this.edgeStore.getLastUpdateInfo()
    };
  }
}