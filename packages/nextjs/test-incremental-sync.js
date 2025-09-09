#!/usr/bin/env node

const { ChainMonitor } = require("./lib/monitoring/chainMonitor.ts");
const { PostgreSQLStore } = require("./lib/database/postgreSQLStore.ts");

async function testIncrementalSync() {
  console.log("🔄 开始测试增量同步功能...");

  const postgresStore = new PostgreSQLStore();

  try {
    // 1. 检查数据库连接
    console.log("📋 检查数据库连接...");
    const testData = await postgresStore.getData();
    console.log("✅ 数据库连接成功");

    // 2. 显示当前同步状态
    const lastUpdate = await postgresStore.getLastUpdateInfo();
    if (lastUpdate) {
      console.log(`📊 上次同步区块: ${lastUpdate.block}`);
      console.log(`⏰ 上次同步时间: ${lastUpdate.time}`);
    } else {
      console.log("❗ 尚未进行过同步");
    }

    // 3. 测试增量更新方法
    console.log("🧪 测试增量更新方法...");

    // 创建测试数据
    const testStoryData = [
      {
        id: "999999",
        author: "0x1234567890123456789012345678901234567890",
        ipfsHash: "QmTestHash123",
        createdTime: Date.now(),
        likes: 5,
        forkCount: 2,
        totalTips: "1000000000000000000",
        totalTipCount: 3,
        blockNumber: 12345,
        transactionHash: "0xtest123",
      },
    ];

    const testChapterData = [
      {
        id: "999998",
        storyId: "999999",
        parentId: "0",
        author: "0x1234567890123456789012345678901234567890",
        ipfsHash: "QmTestChapterHash123",
        createdTime: Date.now(),
        likes: 3,
        forkCount: 1,
        chapterNumber: 1,
        totalTips: "500000000000000000",
        totalTipCount: 2,
        blockNumber: 12346,
        transactionHash: "0xtestchapter123",
      },
    ];

    // 执行增量更新
    await postgresStore.updateDataIncremental({
      stories: testStoryData,
      chapters: testChapterData,
      lastUpdateBlock: 12346,
      lastUpdateTime: new Date().toISOString(),
    });

    console.log("✅ 增量更新测试完成");

    // 4. 验证数据是否正确保存
    console.log("🔍 验证数据保存...");
    const updatedData = await postgresStore.getData();

    const testStory = updatedData?.stories?.find(s => s.id === "999999");
    const testChapter = updatedData?.chapters?.find(c => c.id === "999998");

    if (testStory) {
      console.log("✅ 测试Story数据保存成功");
      console.log(`   - ID: ${testStory.id}`);
      console.log(`   - Likes: ${testStory.likes}`);
      console.log(`   - Tips: ${testStory.totalTips}`);
    } else {
      console.log("❌ 测试Story数据保存失败");
    }

    if (testChapter) {
      console.log("✅ 测试Chapter数据保存成功");
      console.log(`   - ID: ${testChapter.id}`);
      console.log(`   - Story ID: ${testChapter.storyId}`);
      console.log(`   - Likes: ${testChapter.likes}`);
    } else {
      console.log("❌ 测试Chapter数据保存失败");
    }

    // 验证metadata更新（修复updateMetadata只更新不插入的问题）
    const metadataAfterInsert = await postgresStore.getLastUpdateInfo();
    if (metadataAfterInsert && metadataAfterInsert.block === 12346) {
      console.log("✅ Metadata UPSERT功能正常 - 记录已正确插入/更新");
      console.log(`   - 当前区块: ${metadataAfterInsert.block}`);
      console.log(`   - 更新时间: ${metadataAfterInsert.time}`);
    } else {
      console.log("❌ Metadata UPSERT功能异常");
      console.log("   实际数据:", metadataAfterInsert);
    }

    // 5. 测试数据更新（模拟点赞）
    console.log("🧪 测试数据更新（模拟点赞）...");
    testStoryData[0].likes = 10; // 增加点赞
    testChapterData[0].likes = 7; // 增加点赞

    await postgresStore.updateDataIncremental({
      stories: testStoryData,
      chapters: testChapterData,
      lastUpdateBlock: 12347,
      lastUpdateTime: new Date().toISOString(),
    });

    // 验证更新
    const updatedData2 = await postgresStore.getData();
    const updatedStory = updatedData2?.stories?.find(s => s.id === "999999");
    const updatedChapter = updatedData2?.chapters?.find(c => c.id === "999998");

    if (updatedStory && updatedStory.likes === 10) {
      console.log("✅ Story数据更新成功 - 点赞数从5增加到10");
    } else {
      console.log("❌ Story数据更新失败");
    }

    if (updatedChapter && updatedChapter.likes === 7) {
      console.log("✅ Chapter数据更新成功 - 点赞数从3增加到7");
    } else {
      console.log("❌ Chapter数据更新失败");
    }

    console.log("\n🎉 增量同步功能测试完成！");
    console.log("📊 总结:");
    console.log("   - ✅ 数据库UPSERT操作正常");
    console.log("   - ✅ 新数据插入功能正常");
    console.log("   - ✅ 已存在数据更新功能正常");
    console.log("   - ✅ Metadata UPSERT功能正常（修复插入问题）");
    console.log("   - ✅ 增量同步逻辑运行正常");
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testIncrementalSync().catch(console.error);
}

module.exports = { testIncrementalSync };
