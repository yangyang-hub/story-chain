#!/usr/bin/env node

/**
 * 链上数据同步诊断脚本
 * 用于诊断为什么story数据没有同步到数据库
 */

const { ChainMonitor } = require("./lib/monitoring/chainMonitor.ts");
const { PostgreSQLStore } = require("./lib/database/postgreSQLStore.ts");

async function diagnoseSyncIssue() {
  console.log("🔍 开始诊断链上数据同步问题...\n");

  const postgresStore = new PostgreSQLStore();
  let chainMonitor;

  try {
    // 1. 检查数据库连接
    console.log("📋 检查数据库连接...");
    const dbData = await postgresStore.getData();
    console.log("✅ 数据库连接成功");
    console.log(`   当前数据库中有 ${dbData?.stories?.length || 0} 个故事`);
    console.log(`   当前数据库中有 ${dbData?.chapters?.length || 0} 个章节\n`);

    // 2. 检查同步状态
    const lastUpdate = await postgresStore.getLastUpdateInfo();
    if (lastUpdate) {
      console.log(`📊 上次同步状态:`);
      console.log(`   最后同步区块: ${lastUpdate.block}`);
      console.log(`   最后同步时间: ${lastUpdate.time}`);
    } else {
      console.log("⚠️  没有找到同步状态记录，可能是首次同步\n");
    }

    // 3. 创建并测试ChainMonitor
    console.log("🔗 初始化链监控器...");
    chainMonitor = new ChainMonitor();

    const status = await chainMonitor.getStatus();
    console.log("✅ 链监控器初始化成功");
    console.log(`   合约地址: ${status.contractAddress}`);
    console.log(`   监控状态: ${status.isMonitoring ? "运行中" : "已停止"}\n`);

    // 4. 测试合约连接和事件获取
    console.log("🔎 测试事件获取...");

    // 手动测试事件获取
    const testClient = chainMonitor.getClientForDiagnosis();
    const contractAddress = status.contractAddress;

    // 获取最近的一些区块来查看是否有事件
    const currentBlock = await testClient.getBlockNumber();
    console.log(`当前区块高度: ${currentBlock}`);

    // 测试获取最近100个区块的事件
    const fromBlock = currentBlock > 100n ? currentBlock - 100n : 0n;
    console.log(`正在搜索区块 ${fromBlock} 到 ${currentBlock} 的事件...`);

    const logs = await testClient.getLogs({
      address: contractAddress,
      fromBlock,
      toBlock: currentBlock,
    });

    console.log(`找到 ${logs.length} 个原始日志`);

    if (logs.length > 0) {
      console.log("\n📋 原始日志示例（前3个）:");
      logs.slice(0, 3).forEach((log, index) => {
        console.log(`   日志 ${index + 1}:`);
        console.log(`     地址: ${log.address}`);
        console.log(`     主题数量: ${log.topics.length}`);
        console.log(`     数据长度: ${log.data.length}`);
        console.log(`     区块: ${log.blockNumber}`);
      });
    }

    // 5. 测试事件解析
    console.log("\n🧪 测试事件解析...");

    if (logs.length > 0) {
      // 使用我们修复后的processEvents方法
      const processedEvents = await chainMonitor.processEventsForDiagnosis(logs);
      console.log(`成功解析 ${processedEvents.length} 个事件`);

      if (processedEvents.length > 0) {
        console.log("\n📊 解析后的事件（前5个）:");
        processedEvents.slice(0, 5).forEach((event, index) => {
          console.log(`   事件 ${index + 1}:`);
          console.log(`     类型: ${event.type}`);
          console.log(`     区块: ${event.blockNumber}`);
          console.log(`     时间戳: ${event.timestamp}`);
          console.log(`     参数: ${JSON.stringify(event.data)}`);
        });

        // 检查是否有StoryCreated事件
        const storyEvents = processedEvents.filter(e => e.type === "StoryCreated");
        console.log(`\n📖 找到 ${storyEvents.length} 个StoryCreated事件`);

        if (storyEvents.length > 0) {
          console.log("✅ 发现StoryCreated事件，这很好！");

          // 6. 测试数据库插入
          console.log("\n💾 测试数据库插入...");

          const testEvent = storyEvents[0];
          console.log(`正在测试插入事件: ${JSON.stringify(testEvent.data)}`);

          try {
            await postgresStore.processEventDirectly(
              testEvent.type,
              testEvent.data,
              testEvent.blockNumber,
              testEvent.transactionHash,
              testEvent.timestamp,
            );
            console.log("✅ 数据库插入测试成功");

            // 验证数据是否真的插入了
            const updatedData = await postgresStore.getData();
            const newStoryCount = updatedData?.stories?.length || 0;
            console.log(`数据库现在有 ${newStoryCount} 个故事`);

            if (newStoryCount > (dbData?.stories?.length || 0)) {
              console.log("🎉 数据库插入确认成功！");
            }
          } catch (insertError) {
            console.error("❌ 数据库插入测试失败:", insertError);
          }
        } else {
          console.log("⚠️  没有发现StoryCreated事件");
          console.log("   这可能意味着：");
          console.log("   1. 合约中没有创建过故事");
          console.log("   2. 事件解析有问题");
          console.log("   3. 合约地址不正确");
        }
      } else {
        console.log("❌ 事件解析失败，没有解析出任何事件");
      }
    } else {
      console.log("⚠️  没有找到任何日志");
      console.log("   可能的原因：");
      console.log("   1. 合约地址不正确");
      console.log("   2. 区块范围内没有相关活动");
      console.log("   3. 链连接有问题");
    }
  } catch (error) {
    console.error("❌ 诊断过程中发生错误:", error);
    console.error("\n调试信息:");
    console.error("  错误类型:", error.constructor.name);
    console.error("  错误信息:", error.message);
    if (error.stack) {
      console.error("  错误堆栈:", error.stack);
    }
  }

  console.log("\n📋 诊断总结:");
  console.log("   如果看到了StoryCreated事件但数据库中没有数据：");
  console.log("   - 检查事件参数解析是否正确");
  console.log("   - 检查数据库插入逻辑");
  console.log("   - 检查事务提交是否成功");
  console.log("   如果没有看到任何事件：");
  console.log("   - 检查合约地址");
  console.log("   - 检查链连接");
  console.log("   - 检查合约中是否真的有故事被创建");
}

// 如果直接运行此脚本
if (require.main === module) {
  diagnoseSyncIssue().catch(console.error);
}

module.exports = { diagnoseSyncIssue };
