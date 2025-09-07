import { ChainMonitor } from "./chainMonitor";

// 全局监控实例
let globalMonitor: ChainMonitor | null = null;

export async function initializeMonitoring() {
  if (globalMonitor) {
    console.log("监控已经运行中");
    return globalMonitor;
  }

  try {
    globalMonitor = new ChainMonitor();

    // 根据环境变量决定是否自动启动监控
    const autoStart = process.env.AUTO_START_MONITOR === "true";

    if (autoStart) {
      await globalMonitor.startMonitoring();
      console.log("自动启动链上数据监控");
    } else {
      console.log("自动监控未开启，请手动启动");
    }

    return globalMonitor;
  } catch (error) {
    console.error("初始化监控失败:", error);
    return null;
  }
}

export function getGlobalMonitor(): ChainMonitor | null {
  return globalMonitor;
}

export function stopGlobalMonitor() {
  if (globalMonitor) {
    globalMonitor.stopMonitoring();
    globalMonitor = null;
    console.log("全局监控已停止");
  }
}

// 处理进程退出时的清理
process.on("SIGINT", () => {
  console.log("收到 SIGINT，停止监控...");
  stopGlobalMonitor();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("收到 SIGTERM，停止监控...");
  stopGlobalMonitor();
  process.exit(0);
});
