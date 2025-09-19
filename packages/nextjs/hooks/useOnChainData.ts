"use client";

import { useReadContract, useReadContracts } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { Address } from "viem";

const storyChainContract = deployedContracts[31337]?.StoryChain;

export interface StoryData {
  id: bigint;
  author: Address;
  ipfsHash: string;
  createdTime: bigint;
  likes: bigint;
  forkCount: bigint;
  forkFee: bigint;
  isDeposited: boolean;
  deposited: bigint;
  totalTips: bigint;
  totalTipCount: bigint;
  totalForkFees: bigint;
  firstChapterId: bigint;
}

export interface ChapterData {
  id: bigint;
  parentId: bigint;
  storyId: bigint;
  author: Address;
  ipfsHash: string;
  createdTime: bigint;
  likes: bigint;
  forkCount: bigint;
  forkFee: bigint;
  totalForkFees: bigint;
  totalTips: bigint;
  totalTipCount: bigint;
  chapterNumber: bigint;
  childChapterIds: bigint[];
}

export interface CommentData {
  tokenId: bigint;
  commenter: Address;
  ipfsHash: string;
  timestamp: bigint;
}

// 获取故事总数
export function useTotalStories() {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getTotalStories",
  });
}

// 获取章节总数
export function useTotalChapters() {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getTotalChapters",
  });
}

// 分页获取故事列表
export function useStoriesPaginated(offset: number = 0, limit: number = 20) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getStoriesPaginated",
    args: [BigInt(offset), BigInt(limit)],
  });
}

// 获取最新故事列表
export function useLatestStories(limit: number = 10) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getLatestStories",
    args: [BigInt(limit)],
  });
}

// 获取最新章节列表
export function useLatestChapters(limit: number = 10) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getLatestChapters",
    args: [BigInt(limit)],
  });
}

// 获取按点赞数排序的故事
export function useTopStoriesByLikes(limit: number = 10) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getTopStoriesByLikes",
    args: [BigInt(limit)],
  });
}

// 获取按点赞数排序的章节
export function useTopChaptersByLikes(limit: number = 10) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getTopChaptersByLikes",
    args: [BigInt(limit)],
  });
}

// 获取指定作者的故事
export function useStoriesByAuthor(author: Address | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getStoriesByAuthor",
    args: author ? [author] : undefined,
    query: {
      enabled: !!author,
    },
  });
}

// 获取指定作者的章节
export function useChaptersByAuthor(author: Address | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getChaptersByAuthor",
    args: author ? [author] : undefined,
    query: {
      enabled: !!author,
    },
  });
}

// 获取故事详情
export function useStory(storyId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getStory",
    args: storyId ? [storyId] : undefined,
    query: {
      enabled: !!storyId,
    },
  });
}

// 获取章节详情
export function useChapter(chapterId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getChapter",
    args: chapterId ? [chapterId] : undefined,
    query: {
      enabled: !!chapterId,
    },
  });
}

// 获取故事的所有章节
export function useChaptersByStory(storyId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getChaptersByStory",
    args: storyId ? [storyId] : undefined,
    query: {
      enabled: !!storyId,
    },
  });
}

// 获取子章节
export function useChildChapters(parentId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getChildChapters",
    args: parentId ? [parentId] : undefined,
    query: {
      enabled: !!parentId,
    },
  });
}

// 获取评论数量
export function useCommentCount(tokenId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getCommentCount",
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: !!tokenId,
    },
  });
}

// 分页获取评论
export function useCommentsPaginated(tokenId: bigint | undefined, offset: number = 0, limit: number = 20) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getCommentsPaginated",
    args: tokenId ? [tokenId, BigInt(offset), BigInt(limit)] : undefined,
    query: {
      enabled: !!tokenId,
    },
  });
}

// 获取用户点赞状态
export function useUserLikeStatus(user: Address | undefined, tokenId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getUserLikeStatus",
    args: user && tokenId ? [user, tokenId] : undefined,
    query: {
      enabled: !!(user && tokenId),
    },
  });
}

// 批量获取用户点赞状态
export function useBatchLikeStatus(user: Address | undefined, tokenIds: bigint[] | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getBatchLikeStatus",
    args: user && tokenIds && tokenIds.length > 0 ? [user, tokenIds] : undefined,
    query: {
      enabled: !!(user && tokenIds && tokenIds.length > 0),
    },
  });
}

// 获取用户待提取奖励
export function usePendingRewards(user: Address | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getPendingRewards",
    args: user ? [user] : undefined,
    query: {
      enabled: !!user,
    },
  });
}

// 检查token是否存在
export function useTokenExists(tokenId: bigint | undefined) {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "tokenExists",
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: !!tokenId,
    },
  });
}

// 获取所有故事ID
export function useAllStoryIds() {
  return useReadContract({
    address: storyChainContract?.address,
    abi: storyChainContract?.abi,
    functionName: "getAllStoryIds",
  });
}

// 组合数据查询：获取用户资料数据
export function useUserProfile(userAddress: Address | undefined) {
  const { data: userStories, isLoading: storiesLoading, error: storiesError } = useStoriesByAuthor(userAddress);
  const { data: userChapters, isLoading: chaptersLoading, error: chaptersError } = useChaptersByAuthor(userAddress);
  const { data: pendingRewards, isLoading: rewardsLoading, error: rewardsError } = usePendingRewards(userAddress);

  return {
    userStories,
    userChapters,
    pendingRewards,
    isLoading: storiesLoading || chaptersLoading || rewardsLoading,
    error: storiesError || chaptersError || rewardsError,
  };
}

// 组合数据查询：获取首页数据
export function useHomePageData() {
  const { data: totalStories, isLoading: totalStoriesLoading } = useTotalStories();
  const { data: totalChapters, isLoading: totalChaptersLoading } = useTotalChapters();
  const { data: latestStories, isLoading: latestStoriesLoading } = useLatestStories(10);
  const { data: latestChapters, isLoading: latestChaptersLoading } = useLatestChapters(10);
  const { data: topStories, isLoading: topStoriesLoading } = useTopStoriesByLikes(5);

  return {
    totalStories,
    totalChapters,
    latestStories,
    latestChapters,
    topStories,
    isLoading: totalStoriesLoading || totalChaptersLoading || latestStoriesLoading || latestChaptersLoading || topStoriesLoading,
  };
}