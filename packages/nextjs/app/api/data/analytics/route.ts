import { NextResponse } from "next/server";
import { createChainClient, getContractConfig } from "../../../../lib/chains";
import { Address } from "viem";

export async function GET() {
  try {
    // 在请求时动态创建客户端和获取合约配置
    const publicClient = createChainClient();
    const storyChainContract = getContractConfig();

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    // 并行获取基础统计数据
    const [totalStories, totalChapters, topStories, topChapters, latestStories, latestChapters] = await Promise.all([
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
      publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getTopStoriesByLikes",
        args: [BigInt(10)],
      }),
      publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getTopChaptersByLikes",
        args: [BigInt(10)],
      }),
      publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getLatestStories",
        args: [BigInt(10)],
      }),
      publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getLatestChapters",
        args: [BigInt(10)],
      }),
    ]);

    // 计算总点赞数和总打赏
    let totalLikes = 0n;
    let totalTips = 0n;
    let totalComments = 0n;
    const authorsSet = new Set<string>();

    // 统计故事数据
    const storyStats = await Promise.all(
      Array.from({ length: Number(totalStories) }, (_, i) =>
        publicClient.readContract({
          address: storyChainContract.address as Address,
          abi: storyChainContract.abi,
          functionName: "getStory",
          args: [BigInt(i + 1)],
        }),
      ),
    );

    storyStats.forEach((story: any) => {
      if (story && story.id !== 0n) {
        totalLikes += story.likes;
        totalTips += story.totalTips;
        authorsSet.add(story.author.toLowerCase());
      }
    });

    // 统计章节数据（获取最新的100个章节作为样本）
    const sampleChapters = Number(totalChapters) > 100 ? 100 : Number(totalChapters);
    if (sampleChapters > 0) {
      const chapterStats = await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getLatestChapters",
        args: [BigInt(sampleChapters)],
      });

      await Promise.all(
        chapterStats.map(async (chapter: any) => {
          if (chapter && chapter.id !== 0n) {
            totalLikes += chapter.likes;
            totalTips += chapter.totalTips;
            authorsSet.add(chapter.author.toLowerCase());

            // 获取评论数量
            const commentCount = await publicClient.readContract({
              address: storyChainContract.address as Address,
              abi: storyChainContract.abi,
              functionName: "getCommentCount",
              args: [chapter.id],
            });
            totalComments += commentCount;
          }
        }),
      );
    }

    // 构建分析数据
    const analytics = {
      totalStories: Number(totalStories),
      totalChapters: Number(totalChapters),
      totalComments: Number(totalComments),
      totalAuthors: authorsSet.size,
      totalLikes: Number(totalLikes),
      totalTips: totalTips.toString(),
      mostLikedStoryId: topStories.length > 0 ? topStories[0].id.toString() : null,
      mostForkedStoryId:
        topStories.length > 0
          ? [...topStories].sort((a, b) => Number(b.forkCount) - Number(a.forkCount))[0].id.toString()
          : null,

      // 顶级作者（从最受欢迎的故事和章节中提取）
      topAuthors: [
        ...new Set([...topStories.slice(0, 5).map(s => s.author), ...topChapters.slice(0, 5).map(c => c.author)]),
      ]
        .slice(0, 10)
        .map(author => ({
          address: author,
          storyCount: storyStats.filter(s => s && s.author.toLowerCase() === author.toLowerCase()).length,
          chapterCount: 0, // 简化版本，实际需要遍历所有章节
          totalEarnings: "0", // 需要计算实际收益
        })),

      // 最近活动（从最新故事和章节构建）
      recentActivity: [
        ...latestStories.slice(0, 10).map((story: any) => ({
          type: "StoryCreated",
          timestamp: story.createdTime.toString(),
          data: {
            storyId: story.id.toString(),
            author: story.author,
          },
        })),
        ...latestChapters.slice(0, 10).map((chapter: any) => ({
          type: "ChapterCreated",
          timestamp: chapter.createdTime.toString(),
          data: {
            chapterId: chapter.id.toString(),
            storyId: chapter.storyId.toString(),
            author: chapter.author,
          },
        })),
      ]
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, 20),
    };

    return NextResponse.json({
      analytics,
    });
  } catch (error) {
    console.error("Error fetching analytics from blockchain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
