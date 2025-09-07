export async function register() {
  // 仅在服务端运行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('正在启动 Story Chain 应用...');
    
    try {
      // 动态导入监控模块以避免在构建时运行
      const { initializeMonitoring } = await import('./lib/monitoring');
      
      // 初始化监控系统
      await initializeMonitoring();
      console.log('✅ 链上数据监控已自动启动');
    } catch (error) {
      console.error('❌ 监控初始化失败:', error);
    }
  }
}