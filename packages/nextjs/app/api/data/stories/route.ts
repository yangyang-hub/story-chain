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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdTime";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    let stories: any[];

    if (author) {
      // 获取指定作者的故事
      stories = [...await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getStoriesByAuthor",
        args: [author],
      })];
    } else {
      // 获取分页故事列表
      const offset = (page - 1) * limit;
      const result = await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getStoriesPaginated",
        args: [BigInt(offset), BigInt(limit)],
      });

      stories = [...result[0]]; // storiesArray
      const total = result[1]; // total

      // 转换BigInt为字符串以便JSON序列化
      const serializedStories = stories.map(story => ({
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
      }));

      return NextResponse.json({
        stories: serializedStories,
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
          hasNext: (page * limit) < Number(total),
          hasPrev: page > 1,
        },
      });
    }

    // 处理按作者筛选的情况
    const serializedStories = stories.map(story => ({
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
    }));

    // 客户端排序（因为合约返回的是固定顺序）
    serializedStories.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      // 数值比较
      if (["likes", "forkCount", "totalTips", "totalTipCount", "createdTime"].includes(sortBy)) {
        aValue = BigInt(aValue);
        bValue = BigInt(bValue);
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // 手动分页（当按作者筛选时）
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStories = serializedStories.slice(startIndex, endIndex);

    return NextResponse.json({
      stories: paginatedStories,
      pagination: {
        page,
        limit,
        total: serializedStories.length,
        totalPages: Math.ceil(serializedStories.length / limit),
        hasNext: endIndex < serializedStories.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching stories from blockchain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
