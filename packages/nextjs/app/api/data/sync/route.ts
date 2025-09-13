import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";
import { getGlobalMonitor } from "../../../../lib/monitoring";

export async function POST(request: NextRequest) {
  try {
    // 检查内部API密钥
    const apiKey = request.headers.get("x-api-key") || process.env.INTERNAL_API_KEY;
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monitor = getGlobalMonitor();
    if (!monitor) {
      return NextResponse.json({ error: "Monitor not initialized" }, { status: 503 });
    }

    // 获取请求参数
    const { searchParams } = new URL(request.url);
    const fromBlock = searchParams.get("fromBlock");
    const syncType = searchParams.get("type"); // 新增：同步类型参数

    // 如果指定了同步章节详情
    if (syncType === "chapter-details") {
      const store = new PostgreSQLStore();
      await store.syncChapterDetails();

      return NextResponse.json({
        success: true,
        message: "Chapter details sync completed successfully",
      });
    }

    // 默认的历史数据同步
    const lastUpdate = await monitor.getStatus();
    const startBlock = fromBlock
      ? BigInt(fromBlock)
      : lastUpdate.lastUpdate
        ? BigInt(lastUpdate.lastUpdate.block + 1)
        : undefined;

    // 调用公开的同步方法
    await monitor.syncHistoricalData(startBlock);

    return NextResponse.json({
      success: true,
      message: "Data sync triggered successfully",
      lastUpdate: await monitor.getStatus(),
    });
  } catch (error) {
    console.error("Error triggering data sync:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const monitor = getGlobalMonitor();
    if (!monitor) {
      return NextResponse.json({ error: "Monitor not initialized" }, { status: 503 });
    }

    const status = await monitor.getStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error getting monitor status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
