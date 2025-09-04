import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 验证请求来源（可选：添加 API 密钥验证）
    const apiKey = request.headers.get('x-api-key');
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newData = await request.json();

    // 使用 Vercel Edge Config Management API 更新数据
    const edgeConfigId = process.env.EDGE_CONFIG?.split('/').pop()?.split('?')[0];
    const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;

    if (!edgeConfigId || !edgeConfigToken) {
      throw new Error('Edge Config credentials not configured');
    }

    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${edgeConfigToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'upsert',
            key: 'chain_data',
            value: newData
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Config update failed: ${response.status} ${errorText}`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Edge Config updated successfully'
    });

  } catch (error) {
    console.error('Edge Config update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}