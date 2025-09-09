import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../../lib/database/postgreSQLStore";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    const store = new PostgreSQLStore();
    const stories = await store.getStoriesData();

    if (!stories) {
      return NextResponse.json({ error: "No stories data found" }, { status: 404 });
    }

    const story = stories.find(s => s.id === id);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
