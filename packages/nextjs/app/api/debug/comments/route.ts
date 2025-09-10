import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";
import { getGlobalMonitor } from "../../../../lib/monitoring";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tokenId, testData } = body;

    const store = new PostgreSQLStore();

    if (action === "check-comments") {
      // 检查特定tokenId的评论
      const comments = await store.getCommentsByTokenId(tokenId);
      return NextResponse.json({
        success: true,
        tokenId,
        count: comments.length,
        comments
      });
    }

    if (action === "insert-test-comment") {
      // 插入测试评论
      const testEvent = {
        chapterId: tokenId || "1",
        commenter: testData?.commenter || "0x1234567890123456789012345678901234567890"
      };

      await store.processEventDirectly(
        "CommentAdded",
        testEvent,
        12345,
        testData?.transactionHash || `0xtest${Date.now()}`,
        testData?.logIndex || 0,
        Date.now()
      );

      return NextResponse.json({
        success: true,
        message: "测试评论已插入",
        testEvent
      });
    }

    if (action === "sync-events") {
      // 手动同步事件
      const monitor = getGlobalMonitor();
      if (monitor) {
        await monitor.syncHistoricalData();
        return NextResponse.json({
          success: true,
          message: "已手动触发事件同步"
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "监控未运行"
        }, { status: 400 });
      }
    }

    if (action === "get-all-comments") {
      // 获取所有评论
      const comments = await store.getCommentsData();
      return NextResponse.json({
        success: true,
        count: comments.length,
        comments
      });
    }

    if (action === "update-missing-hashes") {
      // 更新缺少ipfsHash的评论
      await store.updateMissingCommentHashes();
      return NextResponse.json({
        success: true,
        message: "已尝试更新缺少ipfsHash的评论"
      });
    }

    return NextResponse.json({
      success: false,
      message: "未知操作",
      availableActions: ["check-comments", "insert-test-comment", "sync-events", "get-all-comments", "update-missing-hashes"]
    }, { status: 400 });

  } catch (error) {
    console.error("评论测试API错误:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}