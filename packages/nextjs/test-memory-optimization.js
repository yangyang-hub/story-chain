#!/usr/bin/env node

/**
 * 内存优化效果测试脚本
 *
 * 对比优化前后的内存使用情况：
 * - 优化前：加载所有数据到内存
 * - 优化后：直接在数据库处理事件
 */

const { PostgreSQLStore } = require("./lib/database/postgreSQLStore.ts");

function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  return {
    rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100, // MB
    heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
    heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
    external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100, // MB
  };
}

function logMemoryUsage(label) {
  const mem = getMemoryUsage();
  console.log(`📊 ${label}:`);
  console.log(`   - RSS: ${mem.rss} MB`);
  console.log(`   - Heap Used: ${mem.heapUsed} MB`);
  console.log(`   - Heap Total: ${mem.heapTotal} MB`);
  console.log(`   - External: ${mem.external} MB`);
  return mem;
}

async function simulateOldApproach(postgresStore) {
  console.log("\n🔴 模拟优化前的方式：加载所有数据到内存");

  const memBefore = logMemoryUsage("加载前内存使用");

  // 模拟加载所有数据到内存（这是优化前的方式）
  const allData = await postgresStore.getData();
  const stories = allData?.stories || [];
  const chapters = allData?.chapters || [];

  console.log(`📈 已加载 ${stories.length} 个stories 和 ${chapters.length} 个chapters 到内存`);

  const memAfter = logMemoryUsage("加载后内存使用");

  // 模拟处理事件（在内存中操作）
  for (let i = 0; i < 100; i++) {
    // 模拟在内存数组中查找和更新
    const storyToUpdate = stories.find(s => s.id === "1");
    if (storyToUpdate) {
      storyToUpdate.likes += 1;
    }
  }

  const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;
  console.log(`💾 内存增长: ${memoryIncrease} MB`);

  return { stories, chapters, memoryIncrease };
}

async function simulateNewApproach(postgresStore) {
  console.log("\n🟢 模拟优化后的方式：直接数据库操作");

  const memBefore = logMemoryUsage("处理前内存使用");

  // 模拟优化后的方式：直接处理事件，不加载全量数据
  for (let i = 0; i < 100; i++) {
    await postgresStore.processEventDirectly(
      "StoryLiked",
      { storyId: "1", newLikeCount: 100 + i },
      12345,
      "0xtest123",
      Date.now(),
    );
  }

  const memAfter = logMemoryUsage("处理后内存使用");

  // 直接在数据库计算分析数据
  const analytics = await postgresStore.calculateAnalyticsDirect();

  const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;
  console.log(`💾 内存增长: ${memoryIncrease} MB`);
  console.log(`📊 分析数据计算完成: ${analytics.totalStories} stories, ${analytics.totalChapters} chapters`);

  return { memoryIncrease, analytics };
}

async function testMemoryOptimization() {
  console.log("🚀 开始内存优化效果测试...\n");

  const postgresStore = new PostgreSQLStore();

  try {
    // 测试数据库连接
    console.log("🔗 检查数据库连接...");
    const testData = await postgresStore.getData();
    console.log("✅ 数据库连接成功\n");

    // 创建一些测试数据用于对比
    console.log("📝 准备测试数据...");
    const testStories = Array.from({ length: 1000 }, (_, i) => ({
      id: (i + 1).toString(),
      author: `0x${(i + 1).toString(16).padStart(40, "0")}`,
      ipfsHash: `QmTestHash${i + 1}`,
      createdTime: Date.now() - i * 1000,
      likes: Math.floor(Math.random() * 100),
      forkCount: Math.floor(Math.random() * 10),
      totalTips: (Math.random() * 1e18).toString(),
      totalTipCount: Math.floor(Math.random() * 50),
      blockNumber: 12345 + i,
      transactionHash: `0xtest${i + 1}`,
    }));

    const testChapters = Array.from({ length: 5000 }, (_, i) => ({
      id: (i + 1).toString(),
      storyId: Math.floor(i / 5 + 1).toString(),
      parentId: "0",
      author: `0x${(i + 1).toString(16).padStart(40, "0")}`,
      ipfsHash: `QmTestChapterHash${i + 1}`,
      createdTime: Date.now() - i * 1000,
      likes: Math.floor(Math.random() * 50),
      forkCount: Math.floor(Math.random() * 5),
      chapterNumber: (i % 5) + 1,
      totalTips: (Math.random() * 5e17).toString(),
      totalTipCount: Math.floor(Math.random() * 25),
      blockNumber: 12345 + i,
      transactionHash: `0xtestchapter${i + 1}`,
    }));

    // 插入测试数据
    await postgresStore.updateDataIncremental({
      stories: testStories.slice(0, 100), // 只插入部分数据避免太慢
      chapters: testChapters.slice(0, 500),
      lastUpdateBlock: 12345,
      lastUpdateTime: new Date().toISOString(),
    });

    console.log("✅ 测试数据准备完成\n");

    // === 对比测试 ===

    // 1. 测试优化前的方式
    const oldResult = await simulateOldApproach(postgresStore);

    // 强制垃圾回收（如果可能）
    if (global.gc) {
      global.gc();
    }

    // 2. 测试优化后的方式
    const newResult = await simulateNewApproach(postgresStore);

    // === 结果对比 ===
    console.log("\n📈 性能对比结果:");
    console.log("==================================================");
    console.log(`🔴 优化前内存增长: ${oldResult.memoryIncrease} MB`);
    console.log(`🟢 优化后内存增长: ${newResult.memoryIncrease} MB`);

    const memoryReduction = oldResult.memoryIncrease - newResult.memoryIncrease;
    const reductionPercent = Math.round((memoryReduction / oldResult.memoryIncrease) * 100);

    console.log(`💚 内存节省: ${memoryReduction} MB (${reductionPercent}%)`);

    if (memoryReduction > 0) {
      console.log("✅ 内存优化成功！");
    } else {
      console.log("⚠️  内存优化效果不明显，可能需要更大的数据集测试");
    }

    console.log("\n🎯 优化优势总结:");
    console.log("   - ✅ 避免加载全量数据到内存");
    console.log("   - ✅ 支持处理大规模数据集");
    console.log("   - ✅ 降低内存溢出风险");
    console.log("   - ✅ 直接在数据库进行计算");
    console.log("   - ✅ 更好的可扩展性");
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testMemoryOptimization().catch(console.error);
}

module.exports = { testMemoryOptimization };
