import { NextRequest, NextResponse } from "next/server";
import { Address } from "viem";
import { createChainClient, getContractConfig } from "../../../../lib/chains";

export async function GET(request: NextRequest) {
  try {
    // 在请求时动态创建客户端和获取合约配置
    const publicClient = createChainClient();
    const storyChainContract = getContractConfig();

    const { searchParams } = new URL(request.url);
    const author = searchParams.get("author") as Address | null;
    const storyId = searchParams.get("storyId");
    const parentId = searchParams.get("parentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdTime";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    let chapters: any[];

    if (storyId) {
      // 获取指定故事的所有章节
      chapters = [...await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getChaptersByStory",
        args: [BigInt(storyId)],
      })];
    } else if (author) {
      // 获取指定作者的所有章节
      chapters = [...await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getChaptersByAuthor",
        args: [author],
      })];
    } else if (parentId) {
      // 获取指定父章节的子章节
      chapters = [...await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getChildChapters",
        args: [BigInt(parentId)],
      })];
    } else {
      // 获取最新章节（由于合约没有getAllChapters方法，我们使用getLatestChapters）
      const totalChapters = await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getTotalChapters",
      });

      // 获取所有章节（通过getLatestChapters，但这里需要一个更大的limit）
      chapters = [...await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getLatestChapters",
        args: [totalChapters], // 获取所有章节
      })];
    }

    // 转换BigInt为字符串以便JSON序列化
    const serializedChapters = chapters.map(chapter => ({
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
    }));

    // 客户端排序
    serializedChapters.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      // 数值比较
      if (["likes", "forkCount", "totalTips", "totalTipCount", "createdTime", "chapterNumber"].includes(sortBy)) {
        aValue = BigInt(aValue);
        bValue = BigInt(bValue);
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // 手动分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedChapters = serializedChapters.slice(startIndex, endIndex);

    return NextResponse.json({
      chapters: paginatedChapters,
      pagination: {
        page,
        limit,
        total: serializedChapters.length,
        totalPages: Math.ceil(serializedChapters.length / limit),
        hasNext: endIndex < serializedChapters.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching chapters from blockchain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
