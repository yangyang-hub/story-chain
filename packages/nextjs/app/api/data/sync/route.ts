import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { createChainClient, getContractConfig } from "../../../../lib/chains";

export async function POST(request: NextRequest) {
  try {
    // 检查内部API密钥
    const apiKey = request.headers.get("x-api-key") || process.env.INTERNAL_API_KEY;
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 由于不再使用数据库同步，这个API现在只返回成功状态
    // 实际的数据都直接从链上获取，无需同步
    return NextResponse.json({
      success: true,
      message: "Data sync is no longer needed - all data is fetched directly from blockchain",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in sync API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // 在请求时动态创建客户端和获取合约配置
    const publicClient = createChainClient();
    const storyChainContract = getContractConfig();

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    // 获取区块链和合约状态信息
    const [currentBlock, totalStories, totalChapters] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getTotalStories",
      }),
      publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getTotalChapters",
      }),
    ]);

    const status = {
      isMonitoring: true, // 总是为true，因为直接从链上读取
      contractAddress: storyChainContract.address,
      currentBlock: Number(currentBlock),
      totalStories: Number(totalStories),
      totalChapters: Number(totalChapters),
      lastUpdateTime: new Date().toISOString(),
      syncMethod: "direct-blockchain-reads",
      databaseSync: false, // 不再使用数据库同步
    };

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error getting blockchain status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
