import { NextRequest, NextResponse } from "next/server";
import { getGlobalMonitor, initializeMonitoring } from "../../../../lib/monitoring";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "start") {
      // 启动监控
      const monitor = await initializeMonitoring();
      if (monitor) {
        await monitor.startMonitoring();
        return NextResponse.json({ success: true, message: "监控已启动" });
      } else {
        return NextResponse.json({ success: false, message: "监控启动失败" }, { status: 500 });
      }
    } else if (action === "status") {
      // 检查监控状态
      const monitor = getGlobalMonitor();
      if (monitor) {
        const status = await monitor.getStatus();
        return NextResponse.json({
          success: true,
          monitoring: true,
          status,
        });
      } else {
        return NextResponse.json({
          success: true,
          monitoring: false,
          message: "监控未运行",
        });
      }
    } else if (action === "test-comment") {
      // 测试评论插入
      const monitor = getGlobalMonitor();
      if (monitor) {
        // 手动触发一次同步
        await monitor.syncHistoricalData();
        return NextResponse.json({ success: true, message: "已手动触发同步" });
      } else {
        return NextResponse.json({ success: false, message: "监控未运行" }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      actions: ["start", "status", "test-comment"],
    });
  } catch (error) {
    console.error("监控API错误:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 },
    );
  }
}
