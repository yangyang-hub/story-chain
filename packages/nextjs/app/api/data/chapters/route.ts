import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const storyId = searchParams.get("storyId");
    const author = searchParams.get("author");
    const parentId = searchParams.get("parentId");
    const sortBy = searchParams.get("sortBy") || "createdTime";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const store = new PostgreSQLStore();
    const chapters = await store.getChaptersData();

    if (!chapters) {
      return NextResponse.json({ error: "No chapters data found" }, { status: 404 });
    }

    // 过滤
    let filteredChapters = chapters;

    if (storyId) {
      filteredChapters = filteredChapters.filter(chapter => chapter.storyId === storyId);
    }

    if (author) {
      filteredChapters = filteredChapters.filter(chapter => chapter.author.toLowerCase() === author.toLowerCase());
    }

    if (parentId) {
      filteredChapters = filteredChapters.filter(chapter => chapter.parentId === parentId);
    }

    // 排序
    filteredChapters.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

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
    const paginatedChapters = filteredChapters.slice(startIndex, endIndex);

    return NextResponse.json({
      chapters: paginatedChapters,
      pagination: {
        page,
        limit,
        total: filteredChapters.length,
        totalPages: Math.ceil(filteredChapters.length / limit),
        hasNext: endIndex < filteredChapters.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
