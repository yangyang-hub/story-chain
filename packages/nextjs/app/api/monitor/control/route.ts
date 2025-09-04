import { NextRequest, NextResponse } from 'next/server';
import { ChainMonitor } from '../../../../lib/monitoring/chainMonitor';

// 全局监控实例
let monitorInstance: ChainMonitor | null = null;

export async function GET() {
  try {
    if (!monitorInstance) {
      return NextResponse.json({
        status: 'stopped',
        message: 'Monitor not initialized'
      });
    }

    const status = await monitorInstance.getStatus();
    return NextResponse.json(status);

  } catch (error) {
    console.error('Error getting monitor status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'start') {
      if (!monitorInstance) {
        monitorInstance = new ChainMonitor();
      }

      await monitorInstance.startMonitoring();
      
      return NextResponse.json({
        success: true,
        message: 'Monitor started successfully'
      });

    } else if (action === 'stop') {
      if (monitorInstance) {
        monitorInstance.stopMonitoring();
        monitorInstance = null;
      }

      return NextResponse.json({
        success: true,
        message: 'Monitor stopped successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error controlling monitor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}