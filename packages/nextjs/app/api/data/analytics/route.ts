import { NextResponse } from "next/server";
import { PostgreSQLStore } from "../../../../lib/database/postgreSQLStore";

export async function GET() {
  try {
    const store = new PostgreSQLStore();
    const analytics = await store.getAnalyticsData();

    if (!analytics) {
      return NextResponse.json({ error: "No analytics data found" }, { status: 404 });
    }

    return NextResponse.json({
      analytics,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
