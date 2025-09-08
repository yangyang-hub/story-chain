import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const author = searchParams.get("author");
    const sortBy = searchParams.get("sortBy") || "createdTime"; // createdTime, likes, totalTips
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const store = new PostgreSQLStore();
    const stories = await store.getStoriesData();

    if (!stories) {
      return NextResponse.json({ error: "No stories data found" }, { status: 404 });
    }

    // 过滤
    let filteredStories = stories;
    if (author) {
      filteredStories = stories.filter(story => story.author.toLowerCase() === author.toLowerCase());
    }

    // 排序
    filteredStories.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      // 特殊处理数字字符串
      if (sortBy === "totalTips") {
        aValue = BigInt(aValue);
        bValue = BigInt(bValue);
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStories = filteredStories.slice(startIndex, endIndex);

    return NextResponse.json({
      stories: paginatedStories,
      pagination: {
        page,
        limit,
        total: filteredStories.length,
        totalPages: Math.ceil(filteredStories.length / limit),
        hasNext: endIndex < filteredStories.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
