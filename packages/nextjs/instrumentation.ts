export async function register() {
  // 仅在服务端运行
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("正在启动 Story Chain 应用...");
    console.log("✅ 应用已启动 - 所有数据直接从区块链获取，无需数据库监控");
  }
}
