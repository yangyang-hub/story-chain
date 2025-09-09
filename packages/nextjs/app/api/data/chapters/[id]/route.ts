import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../../lib/database/postgreSQLStore";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Chapter ID is required" }, { status: 400 });
    }

    const store = new PostgreSQLStore();
    const chapters = await store.getChaptersData();

    if (!chapters) {
      return NextResponse.json({ error: "No chapters data found" }, { status: 404 });
    }

    const chapter = chapters.find(c => c.id === id);

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error("Error fetching chapter:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
