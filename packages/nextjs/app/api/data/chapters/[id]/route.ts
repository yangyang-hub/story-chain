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
      return NextResponse.json({ error: "Chapter ID is required" }, { status: 400 });
    }

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    const chapter = await publicClient.readContract({
      address: storyChainContract.address as Address,
      abi: storyChainContract.abi,
      functionName: "getChapter",
      args: [BigInt(id)],
    });

    if (!chapter || chapter.id === 0n) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // 转换BigInt为字符串以便JSON序列化
    const serializedChapter = {
      id: chapter.id.toString(),
      parentId: chapter.parentId.toString(),
      storyId: chapter.storyId.toString(),
      author: chapter.author,
      ipfsHash: chapter.ipfsHash,
      createdTime: chapter.createdTime.toString(),
      likes: chapter.likes.toString(),
      forkCount: chapter.forkCount.toString(),
      forkFee: chapter.forkFee.toString(),
      totalForkFees: chapter.totalForkFees.toString(),
      totalTips: chapter.totalTips.toString(),
      totalTipCount: chapter.totalTipCount.toString(),
      chapterNumber: chapter.chapterNumber.toString(),
      childChapterIds: chapter.childChapterIds.map((id: bigint) => id.toString()),
    };

    return NextResponse.json({ chapter: serializedChapter });
  } catch (error) {
    console.error("Error fetching chapter from blockchain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
