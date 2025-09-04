import { NextRequest, NextResponse } from 'next/server';
import { EdgeConfigStore } from '../../../../lib/monitoring/edgeConfigStore';

export async function GET(request: NextRequest) {
  try {
    const edgeStore = new EdgeConfigStore();
    const analytics = await edgeStore.getAnalyticsData();

    if (!analytics) {
      return NextResponse.json(
        { error: 'No analytics data found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      analytics
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}