import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const store = new PostgreSQLStore();

    if (tokenId) {
      // 获取特定故事/章节的评论
      const comments = await store.getCommentsByTokenId(tokenId);
      
      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedComments = comments.slice(startIndex, endIndex);

      return NextResponse.json({
        comments: paginatedComments,
        pagination: {
          page,
          limit,
          total: comments.length,
          totalPages: Math.ceil(comments.length / limit),
          hasNext: endIndex < comments.length,
          hasPrev: page > 1,
        },
      });
    } else {
      // 获取所有评论
      const comments = await store.getCommentsData();
      
      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedComments = comments.slice(startIndex, endIndex);

      return NextResponse.json({
        comments: paginatedComments,
        pagination: {
          page,
          limit,
          total: comments.length,
          totalPages: Math.ceil(comments.length / limit),
          hasNext: endIndex < comments.length,
          hasPrev: page > 1,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}