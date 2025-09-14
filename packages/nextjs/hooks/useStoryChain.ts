"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import {
  type ChapterMetadata,
  type CommentMetadata,
  type StoryMetadata,
  getJSONFromIPFS,
  uploadChapterMetadata,
  uploadCommentMetadata,
  uploadStoryMetadata,
} from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

export interface Story {
  id: bigint;
  author: string;
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

export interface Chapter {
  id: bigint;
  parentId: bigint;
  storyId: bigint;
  author: string;
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

export interface Comment {
  tokenId: bigint;
  commenter: string;
  ipfsHash: string;
  timestamp: bigint;
}

export const useStoryChain = () => {
  const { address } = useAccount();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  // 合约写入操作
  const { writeContractAsync } = useScaffoldWriteContract("StoryChain");

  // 读取合约常量
  const { data: freeStoryCount } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "FREE_STORY_COUNT",
  });

  const { data: storyDeposit } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "DEFAULT_STORY_DEPOSIT",
  });

  const { data: minChaptersForDeposit } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "MIN_CHAPTERS_FOR_DEPOSIT",
  });

  // 获取故事总数（通过事件）
  const { data: storyEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "StoryCreated",
    fromBlock: 0n,
  });

  const storyCount = storyEvents?.length || 0;

  // 获取用户的待提取奖励
  const { data: pendingRewards } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "pendingWithdrawals",
    args: address ? [address] : [undefined as unknown as string],
  });

  // 1. 创建故事
  const createStory = async (metadata: StoryMetadata, forkFeeEth: string = "0") => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      // 上传到IPFS
      const ipfsHash = await uploadStoryMetadata(metadata);

      // 确定是否需要质押
      const needsDeposit = freeStoryCount && storyCount >= Number(freeStoryCount);
      const depositAmount = needsDeposit && storyDeposit ? storyDeposit : 0n;

      // 调用合约
      await writeContractAsync({
        functionName: "createStory",
        args: [ipfsHash, parseEther(forkFeeEth)],
        value: depositAmount,
      });

      notification.success(t("success.story_created"));
      return ipfsHash;
    } catch (error) {
      console.error("创建故事失败:", error);
      notification.error(error instanceof Error ? error.message : "创建故事失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 创建章节
  const createChapter = async (
    storyId: bigint,
    parentId: bigint,
    metadata: ChapterMetadata,
    forkFeeEth: string = "0",
  ) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约
      await writeContractAsync({
        functionName: "createChapter",
        args: [storyId, parentId, ipfsHash, parseEther(forkFeeEth)],
      });

      notification.success(t("success.chapter_added"));
      return ipfsHash;
    } catch (error) {
      console.error("创建章节失败:", error);
      notification.error(error instanceof Error ? error.message : "创建章节失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 分叉故事
  const forkStory = async (
    storyId: bigint,
    parentId: bigint,
    metadata: ChapterMetadata,
    forkFeeEth: string = "0",
    forkFeeValue: string,
  ) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约
      await writeContractAsync({
        functionName: "forkStory",
        args: [storyId, parentId, ipfsHash, parseEther(forkFeeEth)],
        value: parseEther(forkFeeValue),
      });

      notification.success(t("success.story_forked"));
      return ipfsHash;
    } catch (error) {
      console.error("分叉故事失败:", error);
      notification.error(error instanceof Error ? error.message : "分叉故事失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 为故事点赞
  const likeStory = async (storyId: bigint) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      await writeContractAsync({
        functionName: "likeStory",
        args: [storyId],
      });

      notification.success(t("success.liked"));
    } catch (error) {
      console.error("点赞失败:", error);
      notification.error(error instanceof Error ? error.message : "点赞失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 5. 为章节点赞
  const likeChapter = async (chapterId: bigint) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      await writeContractAsync({
        functionName: "likeChapter",
        args: [chapterId],
      });

      notification.success(t("success.liked"));
    } catch (error) {
      console.error("点赞失败:", error);
      notification.error(error instanceof Error ? error.message : "点赞失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 6. 添加评论
  const addComment = async (tokenId: bigint, metadata: CommentMetadata) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      // 上传到IPFS
      const ipfsHash = await uploadCommentMetadata(metadata);

      await writeContractAsync({
        functionName: "addComment",
        args: [tokenId, ipfsHash],
      });

      notification.success(t("success.comment_added"));
      return ipfsHash;
    } catch (error) {
      console.error("添加评论失败:", error);
      notification.error(error instanceof Error ? error.message : "添加评论失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 7. 打赏
  const tip = async (chapterId: bigint, amountEth: string) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      await writeContractAsync({
        functionName: "tip",
        args: [chapterId],
        value: parseEther(amountEth),
      });

      notification.success(t("success.tipped"));
    } catch (error) {
      console.error("打赏失败:", error);
      notification.error(error instanceof Error ? error.message : "打赏失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 8. 提取奖励
  const withdrawRewards = async () => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    if (!pendingRewards || pendingRewards === 0n) {
      notification.warning("没有可提取的奖励");
      return;
    }

    try {
      setIsLoading(true);

      await writeContractAsync({
        functionName: "withdrawRewards",
        args: undefined,
      });

      notification.success(`成功提取 ${formatEther(pendingRewards)} STT`);
    } catch (error) {
      console.error("提取奖励失败:", error);
      notification.error(error instanceof Error ? error.message : "提取奖励失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 9. 更新故事分叉费用
  const updateStoryForkFee = async (storyId: bigint, newForkFeeEth: string) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      await writeContractAsync({
        functionName: "updateStoryForkFee",
        args: [storyId, parseEther(newForkFeeEth)],
      });

      notification.success("分叉费用更新成功");
    } catch (error) {
      console.error("更新分叉费用失败:", error);
      notification.error(error instanceof Error ? error.message : "更新失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 10. 更新章节分叉费用
  const updateChapterForkFee = async (chapterId: bigint, newForkFeeEth: string) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      throw new Error("Wallet not connected");
    }

    try {
      setIsLoading(true);

      await writeContractAsync({
        functionName: "updateChapterForkFee",
        args: [chapterId, parseEther(newForkFeeEth)],
      });

      notification.success("分叉费用更新成功");
    } catch (error) {
      console.error("更新分叉费用失败:", error);
      notification.error(error instanceof Error ? error.message : "更新失败");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 读取操作辅助函数

  // 获取故事信息
  const getStory = async (storyId: bigint): Promise<Story | null> => {
    try {
      const storyData = await useScaffoldReadContract({
        contractName: "StoryChain",
        functionName: "getStory",
        args: [storyId],
      });

      return storyData?.data as Story | null;
    } catch (error) {
      console.error("获取故事信息失败:", error);
      return null;
    }
  };

  // 获取章节信息
  const getChapter = async (chapterId: bigint): Promise<Chapter | null> => {
    try {
      const chapterData = await useScaffoldReadContract({
        contractName: "StoryChain",
        functionName: "getChapter",
        args: [chapterId],
      });

      return chapterData?.data as Chapter | null;
    } catch (error) {
      console.error("获取章节信息失败:", error);
      return null;
    }
  };

  // 检查用户是否已点赞
  const hasUserLiked = (tokenId: bigint): boolean => {
    const { data: hasLiked } = useScaffoldReadContract({
      contractName: "StoryChain",
      functionName: "hasLiked",
      args: address ? [address, tokenId] : [undefined as unknown as string, undefined as unknown as bigint],
    });

    return hasLiked || false;
  };

  // 获取所有故事事件
  const getAllStoryEvents = () => {
    return useScaffoldEventHistory({
      contractName: "StoryChain",
      eventName: "StoryCreated",
      fromBlock: 0n,
    });
  };

  // 获取所有章节事件
  const getAllChapterEvents = () => {
    return useScaffoldEventHistory({
      contractName: "StoryChain",
      eventName: "ChapterCreated",
      fromBlock: 0n,
    });
  };

  // 获取分叉事件
  const getForkEvents = (storyId?: bigint) => {
    return useScaffoldEventHistory({
      contractName: "StoryChain",
      eventName: "ChapterForked",
      fromBlock: 0n,
      filters: storyId ? { storyId } : undefined,
    });
  };

  // 获取评论事件
  const getCommentEvents = (tokenId?: bigint) => {
    return useScaffoldEventHistory({
      contractName: "StoryChain",
      eventName: "CommentAdded",
      fromBlock: 0n,
      filters: tokenId ? { chapterId: tokenId } : undefined,
    });
  };

  // 获取打赏事件
  const getTipEvents = (chapterId?: bigint) => {
    return useScaffoldEventHistory({
      contractName: "StoryChain",
      eventName: "TipSent",
      fromBlock: 0n,
      filters: chapterId ? { chapterId } : undefined,
    });
  };

  return {
    // 状态
    isLoading,
    address,
    storyCount,
    pendingRewards: pendingRewards ? formatEther(pendingRewards) : "0",

    // 合约常量
    freeStoryCount,
    storyDeposit: storyDeposit ? formatEther(storyDeposit) : "0",
    minChaptersForDeposit,

    // 写入操作
    createStory,
    createChapter,
    forkStory,
    likeStory,
    likeChapter,
    addComment,
    tip,
    withdrawRewards,
    updateStoryForkFee,
    updateChapterForkFee,

    // 读取操作
    getStory,
    getChapter,
    hasUserLiked,

    // 事件查询
    getAllStoryEvents,
    getAllChapterEvents,
    getForkEvents,
    getCommentEvents,
    getTipEvents,
  };
};
