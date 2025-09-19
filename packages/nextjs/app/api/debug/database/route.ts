import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  try {
    const store = new PostgreSQLStore();

    // 测试数据库连接
    const testConnection = async () => {
      try {
        // 尝试获取数据来测试连接
        const lastUpdate = await store.getLastUpdateInfo();
        return { connected: true, lastUpdate };
      } catch (error) {
        return { connected: false, error: error instanceof Error ? error.message : "连接失败" };
      }
    };

    // 获取评论数据
    const getCommentsTest = async () => {
      try {
        const comments = await store.getCommentsData();
        return { success: true, count: comments.length, comments: comments.slice(0, 5) };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "获取评论失败" };
      }
    };

    // 测试手动插入评论
    const testInsertComment = async () => {
      try {
        await store.processEventDirectly(
          "CommentAdded",
          { chapterId: "1", commenter: "0x1234567890123456789012345678901234567890" },
          12345,
          "0xtest123",
          0,
          Date.now(),
        );
        return { success: true, message: "测试评论插入成功" };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "插入失败" };
      }
    };

    const [connection, comments, insertion] = await Promise.all([
      testConnection(),
      getCommentsTest(),
      testInsertComment(),
    ]);

    return NextResponse.json({
      success: true,
      tests: {
        connection,
        comments,
        insertion,
      },
    });
  } catch (error) {
    console.error("数据库测试错误:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 },
    );
  }
}
