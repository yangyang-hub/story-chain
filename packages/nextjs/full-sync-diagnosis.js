#!/usr/bin/env node

/**
 * 完整的链上数据同步诊断和修复脚本
 * 专门用于排查初次同步创世块到当前块时的数据同步问题
 */

const { ChainMonitor } = require("./lib/monitoring/chainMonitor.ts");
const { PostgreSQLStore } = require("./lib/database/postgreSQLStore.ts");

async function fullSyncDiagnosis() {
  console.log("🚀 开始完整的链上数据同步诊断...\n");

  const postgresStore = new PostgreSQLStore();
  let chainMonitor;

  try {
    // 1. 数据库连接和状态检查
    console.log("📋 步骤1: 检查数据库连接和当前状态");
    const initialData = await postgresStore.getData();
    console.log(`   当前数据库中有 ${initialData?.stories?.length || 0} 个故事`);
    console.log(`   当前数据库中有 ${initialData?.chapters?.length || 0} 个章节`);

    const lastUpdate = await postgresStore.getLastUpdateInfo();
    if (lastUpdate) {
      console.log(`   最后同步区块: ${lastUpdate.block}`);
      console.log(`   最后同步时间: ${lastUpdate.time}`);
    } else {
      console.log("   🆕 这是首次同步");
    }

    // 2. 链监控器初始化
    console.log("\n🔗 步骤2: 初始化链监控器");
    chainMonitor = new ChainMonitor();

    const status = await chainMonitor.getStatus();
    console.log("✅ 链监控器初始化成功");
    console.log(`   合约地址: ${status.contractAddress}`);
    console.log(`   当前监控状态: ${status.isMonitoring ? "运行中" : "已停止"}`);

    // 3. 测试区块链连接
    console.log("\n🌐 步骤3: 测试区块链连接");
    const client = chainMonitor.getClientForDiagnosis();
    const currentBlock = await client.getBlockNumber();
    console.log(`✅ 区块链连接成功，当前区块: ${currentBlock}`);

    // 4. 测试合约地址有效性
    console.log("\n🏗️ 步骤4: 验证合约地址");
    try {
      const code = await client.getBytecode({ address: status.contractAddress });
      if (code && code !== "0x") {
        console.log("✅ 合约地址有效，存在字节码");
        console.log(`   字节码长度: ${code.length} 字符`);
      } else {
        console.log("❌ 合约地址无效或没有字节码");
        return;
      }
    } catch (error) {
      console.log("❌ 无法验证合约地址:", error.message);
      return;
    }

    // 5. 测试事件日志获取
    console.log("\n📜 步骤5: 测试历史事件获取");
    const testFromBlock = 0n;
    const testToBlock = currentBlock > 1000n ? 1000n : currentBlock; // 先测试前1000个区块

    console.log(`正在获取区块 ${testFromBlock} 到 ${testToBlock} 的事件...`);

    const logs = await client.getLogs({
      address: status.contractAddress,
      fromBlock: testFromBlock,
      toBlock: testToBlock,
    });

    console.log(`📊 获取到 ${logs.length} 个原始日志`);

    if (logs.length > 0) {
      console.log("✅ 成功获取到事件日志");

      // 显示前几个日志的基本信息
      console.log("   前3个日志信息:");
      logs.slice(0, 3).forEach((log, index) => {
        console.log(
          `     ${index + 1}. 区块: ${log.blockNumber}, 主题数: ${log.topics.length}, 数据长度: ${log.data.length}`,
        );
      });
    } else {
      console.log("⚠️  在测试区块范围内没有找到任何事件日志");
      console.log("   可能原因:");
      console.log("   - 合约在这些区块中没有任何活动");
      console.log("   - 合约地址不正确");
      console.log("   - 事件还没有被触发");

      // 尝试获取更大范围的事件
      if (currentBlock > 1000n) {
        console.log(`\n   尝试获取更大范围的事件 (区块 0 到 ${currentBlock})...`);
        const allLogs = await client.getLogs({
          address: status.contractAddress,
          fromBlock: 0n,
          toBlock: currentBlock,
        });
        console.log(`   在整个区块链历史中找到 ${allLogs.length} 个事件`);

        if (allLogs.length > 0) {
          logs.push(...allLogs);
        }
      }
    }

    // 6. 测试事件解析
    if (logs.length > 0) {
      console.log("\n🧪 步骤6: 测试事件解析");

      const processedEvents = await chainMonitor.processEventsForDiagnosis(logs);
      console.log(`✅ 成功解析出 ${processedEvents.length} 个有效事件`);

      if (processedEvents.length > 0) {
        // 按事件类型统计
        const eventCounts = {};
        processedEvents.forEach(event => {
          eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
        });

        console.log("   事件类型统计:");
        Object.entries(eventCounts).forEach(([type, count]) => {
          console.log(`     ${type}: ${count} 个`);
        });

        // 显示前几个事件的详细信息
        console.log("\n   前3个事件详细信息:");
        processedEvents.slice(0, 3).forEach((event, index) => {
          console.log(`     ${index + 1}. 类型: ${event.type}`);
          console.log(`        区块: ${event.blockNumber}`);
          console.log(`        参数: ${JSON.stringify(event.data)}`);
        });
      } else {
        console.log("❌ 没有解析出任何有效事件");
        console.log("   可能原因:");
        console.log("   - 事件ABI定义与合约不匹配");
        console.log("   - 事件解析逻辑有问题");
      }

      // 7. 测试数据库插入
      if (processedEvents.length > 0) {
        console.log("\n💾 步骤7: 测试数据库插入");

        const storyEvents = processedEvents.filter(e => e.type === "StoryCreated");
        if (storyEvents.length > 0) {
          console.log(`找到 ${storyEvents.length} 个StoryCreated事件，测试插入第一个...`);

          const testEvent = storyEvents[0];
          console.log(`测试事件数据: ${JSON.stringify(testEvent.data)}`);

          try {
            await postgresStore.processEventDirectly(
              testEvent.type,
              testEvent.data,
              testEvent.blockNumber,
              testEvent.transactionHash,
              testEvent.timestamp,
            );

            console.log("✅ 数据库插入测试成功");

            // 验证数据是否实际插入
            const afterInsertData = await postgresStore.getData();
            const newStoryCount = afterInsertData?.stories?.length || 0;

            if (newStoryCount > (initialData?.stories?.length || 0)) {
              console.log(
                `🎉 确认数据插入成功! 故事数量从 ${initialData?.stories?.length || 0} 增加到 ${newStoryCount}`,
              );
            } else {
              console.log("⚠️  数据库中的故事数量没有增加，可能是重复数据或插入失败");
            }
          } catch (insertError) {
            console.log("❌ 数据库插入测试失败:", insertError.message);
          }
        } else {
          console.log("⚠️  没有找到StoryCreated事件来测试数据库插入");
        }
      }

      // 8. 执行完整的同步测试
      console.log("\n🔄 步骤8: 执行完整同步测试");

      if (!chainMonitor.isMonitoring) {
        console.log("开始执行完整的历史数据同步...");

        // 重置同步状态（仅用于测试）
        try {
          await postgresStore.updateDataIncremental({
            lastUpdateBlock: 0,
            lastUpdateTime: new Date().toISOString(),
          });

          // 执行同步
          await chainMonitor.syncHistoricalData(0n);

          // 检查同步结果
          const finalData = await postgresStore.getData();
          const finalStoryCount = finalData?.stories?.length || 0;
          const finalChapterCount = finalData?.chapters?.length || 0;

          console.log("🎯 同步完成结果:");
          console.log(`   故事数量: ${finalStoryCount}`);
          console.log(`   章节数量: ${finalChapterCount}`);

          if (finalStoryCount > 0 || finalChapterCount > 0) {
            console.log("🎉 同步成功！数据已正确同步到数据库");
          } else {
            console.log("⚠️  同步完成但没有数据，请检查是否真的有故事数据");
          }
        } catch (syncError) {
          console.log("❌ 完整同步测试失败:", syncError.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ 诊断过程中发生错误:", error);
  }

  console.log("\n📋 诊断完成总结:");
  console.log("=".repeat(50));
  console.log("如果看到这个脚本的所有步骤都成功：");
  console.log("✅ 数据库连接正常");
  console.log("✅ 合约地址有效");
  console.log("✅ 区块链连接正常");
  console.log("✅ 事件获取成功");
  console.log("✅ 事件解析成功");
  console.log("✅ 数据库插入成功");
  console.log("✅ 完整同步成功");
  console.log("\n如果任何步骤失败，请查看上面的详细错误信息进行排查。");
}

// 如果直接运行此脚本
if (require.main === module) {
  fullSyncDiagnosis().catch(console.error);
}

module.exports = { fullSyncDiagnosis };
