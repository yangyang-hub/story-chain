import { NextRequest, NextResponse } from "next/server";
import { createChainClient, getContractConfig } from "../../../../../lib/chains";
import { Address } from "viem";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 在请求时动态创建客户端和获取合约配置
    const publicClient = createChainClient();
    const storyChainContract = getContractConfig();

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    const story = await publicClient.readContract({
      address: storyChainContract.address as Address,
      abi: storyChainContract.abi,
      functionName: "getStory",
      args: [BigInt(id)],
    });

    if (!story || story.id === 0n) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // 转换BigInt为字符串以便JSON序列化
    const serializedStory = {
      id: story.id.toString(),
      author: story.author,
      ipfsHash: story.ipfsHash,
      createdTime: story.createdTime.toString(),
      likes: story.likes.toString(),
      forkCount: story.forkCount.toString(),
      forkFee: story.forkFee.toString(),
      isDeposited: story.isDeposited,
      deposited: story.deposited.toString(),
      totalTips: story.totalTips.toString(),
      totalTipCount: story.totalTipCount.toString(),
      totalForkFees: story.totalForkFees.toString(),
      firstChapterId: story.firstChapterId.toString(),
    };

    return NextResponse.json({ story: serializedStory });
  } catch (error) {
    console.error("Error fetching story from blockchain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
