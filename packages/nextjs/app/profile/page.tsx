"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useStoryChain } from "~~/hooks/useStoryChain";
import { getJSONFromIPFS } from "~~/services/ipfs/ipfsService";

interface UserStory {
  id: string;
  title: string;
  ipfsHash: string;
  createdTime: number;
  likes: number;
  forkCount: number;
  totalTips: string;
  metadata?: any;
}

interface UserChapter {
  id: string;
  storyId: string;
  title: string;
  ipfsHash: string;
  createdTime: number;
  likes: number;
  forkCount: number;
  totalTips: string;
  chapterNumber: number;
  metadata?: any;
}

interface UserStats {
  totalStories: number;
  totalChapters: number;
  totalLikes: number;
  totalTips: string;
  totalForks: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastLoadTime: number;
}

const ProfilePage = () => {
  const { address } = useAccount();
  const { withdrawRewards, pendingRewards, isLoading } = useStoryChain();

  const [activeTab, setActiveTab] = useState<"stories" | "chapters" | "stats">("stories");
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [userChapters, setUserChapters] = useState<UserChapter[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalStories: 0,
    totalChapters: 0,
    totalLikes: 0,
    totalTips: "0",
    totalForks: 0,
  });

  // 简化状态管理
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    lastLoadTime: 0,
  });

  // 缓存机制 - 5分钟内避免重复加载
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const abortControllerRef = useRef<AbortController | null>(null);

  // Event history hooks for accurate revenue calculations
  const { data: storyRewardEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "StoryRewardsDistributed",
    fromBlock: 0n,
    filters: address ? { storyAuthor: address } : undefined,
  });

  const { data: chapterRewardEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "ChapterRewardsDistributed",
    fromBlock: 0n,
    filters: address ? { chapterAuthor: address } : undefined,
  });

  const { data: withdrawEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "RewardsWithdrawn",
    fromBlock: 0n,
    filters: address ? { user: address } : undefined,
  });

  const { data: forkEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "ChapterForked",
    fromBlock: 0n,
  });

  const loadUserData = useCallback(
    async (targetAddress: string, forceRefresh = false) => {
      // 检查是否需要加载（缓存机制）
      const now = Date.now();
      if (
        !forceRefresh &&
        loadingState.lastLoadTime > 0 &&
        now - loadingState.lastLoadTime < CACHE_DURATION &&
        !loadingState.error
      ) {
        console.log("📦 Using cached data, skipping API call");
        return;
      }

      // 防止重复加载
      if (loadingState.isLoading) {
        console.log("🔄 Already loading, skipping duplicate call");
        return;
      }

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoadingState({
        isLoading: true,
        error: null,
        lastLoadTime: 0,
      });

      try {
        console.log("🚀 Starting data load for", targetAddress);

        const stories: UserStory[] = [];
        const chapters: UserChapter[] = [];

        // 并行加载故事和章节数据
        const [storiesRes, chaptersRes] = await Promise.all([
          fetch(`/api/data/stories?author=${targetAddress}&limit=100`, {
            signal: abortControllerRef.current.signal,
          }),
          fetch(`/api/data/chapters?author=${targetAddress}&limit=100`, {
            signal: abortControllerRef.current.signal,
          }),
        ]);

        // 处理故事数据
        if (storiesRes.ok) {
          const storiesData = await storiesRes.json();
          if (storiesData.stories) {
            const storyPromises = storiesData.stories.map(async (storyData: any) => {
              try {
                let metadata = null;
                let title = `故事 #${storyData.id}`;

                if (storyData.ipfsHash) {
                  try {
                    metadata = await getJSONFromIPFS(storyData.ipfsHash);
                    title = metadata?.title || metadata?.name || title;
                  } catch (error) {
                    console.warn("加载故事元数据失败:", error);
                  }
                }

                return {
                  id: storyData.id,
                  title: title,
                  ipfsHash: storyData.ipfsHash,
                  createdTime: storyData.createdTime * 1000,
                  likes: Number(storyData.likes) || 0,
                  forkCount: Number(storyData.forkCount) || 0,
                  totalTips: storyData.totalTips || "0",
                  metadata,
                };
              } catch (error) {
                console.warn("处理故事数据失败:", error);
                return null;
              }
            });

            const resolvedStories = await Promise.all(storyPromises);
            stories.push(...resolvedStories.filter(story => story !== null));
          }
        } else if (!storiesRes.ok) {
          console.warn("获取故事数据失败:", storiesRes.status, storiesRes.statusText);
        }

        // 处理章节数据
        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          if (chaptersData.chapters) {
            const chapterPromises = chaptersData.chapters.map(async (chapterData: any) => {
              try {
                let metadata = null;
                let title = `章节 #${chapterData.id}`;
                let chapterNumber = 1;

                if (chapterData.ipfsHash) {
                  try {
                    metadata = await getJSONFromIPFS(chapterData.ipfsHash);
                    title = metadata?.title || metadata?.name || title;
                    chapterNumber = metadata?.chapterNumber || 1;
                  } catch (error) {
                    console.warn("加载章节元数据失败:", error);
                  }
                }

                return {
                  id: chapterData.id,
                  storyId: chapterData.storyId,
                  title: title,
                  ipfsHash: chapterData.ipfsHash,
                  createdTime: chapterData.createdTime * 1000,
                  likes: Number(chapterData.likes) || 0,
                  forkCount: Number(chapterData.forkCount) || 0,
                  totalTips: chapterData.totalTips || "0",
                  chapterNumber: chapterNumber,
                  metadata,
                };
              } catch (error) {
                console.warn("处理章节数据失败:", error);
                return null;
              }
            });

            const resolvedChapters = await Promise.all(chapterPromises);
            chapters.push(...resolvedChapters.filter(chapter => chapter !== null));
          }
        } else if (!chaptersRes.ok) {
          console.warn("获取章节数据失败:", chaptersRes.status, chaptersRes.statusText);
        }

        // 更新状态
        setUserStories(stories);
        setUserChapters(chapters);

        // 计算统计信息
        const totalStories = stories.length;
        const totalChapters = chapters.length;
        const totalLikes =
          stories.reduce((sum: number, story: UserStory) => sum + story.likes, 0) +
          chapters.reduce((sum: number, chapter: UserChapter) => sum + chapter.likes, 0);

        const totalTipsWei =
          stories.reduce((sum: bigint, story: UserStory) => sum + BigInt(story.totalTips || "0"), 0n) +
          chapters.reduce((sum: bigint, chapter: UserChapter) => sum + BigInt(chapter.totalTips || "0"), 0n);
        const totalTipsValue = parseFloat(formatEther(totalTipsWei));

        const totalForks =
          stories.reduce((sum: number, story: UserStory) => sum + story.forkCount, 0) +
          chapters.reduce((sum: number, chapter: UserChapter) => sum + chapter.forkCount, 0);

        setUserStats({
          totalStories,
          totalChapters,
          totalLikes,
          totalTips: totalTipsValue.toString(),
          totalForks,
        });

        setLoadingState({
          isLoading: false,
          error: null,
          lastLoadTime: now,
        });

        console.log("✅ Data load completed successfully");
      } catch (error: any) {
        // 如果是取消的请求，不处理错误
        if (error.name === "AbortError") {
          console.log("📡 Request was cancelled");
          return;
        }

        console.error("❌ 加载用户数据失败:", error);

        const errorMessage = error instanceof Error ? error.message : "加载数据时发生未知错误，请稍后重试";

        setLoadingState({
          isLoading: false,
          error: errorMessage,
          lastLoadTime: 0,
        });
      }
    },
    [loadingState.isLoading, loadingState.lastLoadTime, loadingState.error, CACHE_DURATION],
  );

  // Use memoization for revenue calculations with accurate event-based data
  const calculatedRevenueStats = useMemo(() => {
    if (!address) {
      return {
        tipRevenue: "0",
        forkRevenue: "0",
        totalRevenue: "0",
        withdrawnAmount: "0",
      };
    }

    // Get transaction hashes of all fork events to distinguish fork rewards from tip rewards
    const forkTxHashes = new Set(forkEvents?.map(event => event.transactionHash?.toLowerCase()).filter(Boolean) || []);

    // Calculate fork revenue: rewards from transactions that contain fork events
    let totalForkRevenue = 0n;

    // Story rewards from fork events
    if (storyRewardEvents) {
      storyRewardEvents.forEach(event => {
        const txHash = event.transactionHash?.toLowerCase();
        if (txHash && forkTxHashes.has(txHash) && event.args?.storyAuthor?.toLowerCase() === address.toLowerCase()) {
          totalForkRevenue += BigInt(event.args.amount || 0);
        }
      });
    }

    // Chapter rewards from fork events
    if (chapterRewardEvents) {
      chapterRewardEvents.forEach(event => {
        const txHash = event.transactionHash?.toLowerCase();
        if (txHash && forkTxHashes.has(txHash) && event.args?.chapterAuthor?.toLowerCase() === address.toLowerCase()) {
          totalForkRevenue += BigInt(event.args.amount || 0);
        }
      });
    }

    // Calculate tip revenue: rewards from transactions that do NOT contain fork events
    let totalTipRevenue = 0n;

    // Story rewards from tip events (non-fork transactions)
    if (storyRewardEvents) {
      storyRewardEvents.forEach(event => {
        const txHash = event.transactionHash?.toLowerCase();
        if (txHash && !forkTxHashes.has(txHash) && event.args?.storyAuthor?.toLowerCase() === address.toLowerCase()) {
          totalTipRevenue += BigInt(event.args.amount || 0);
        }
      });
    }

    // Chapter rewards from tip events (non-fork transactions)
    if (chapterRewardEvents) {
      chapterRewardEvents.forEach(event => {
        const txHash = event.transactionHash?.toLowerCase();
        if (txHash && !forkTxHashes.has(txHash) && event.args?.chapterAuthor?.toLowerCase() === address.toLowerCase()) {
          totalTipRevenue += BigInt(event.args.amount || 0);
        }
      });
    }

    // Calculate total withdrawn amount from RewardsWithdrawn events
    let totalWithdrawn = 0n;
    if (withdrawEvents) {
      withdrawEvents.forEach(event => {
        if (event.args?.user?.toLowerCase() === address.toLowerCase()) {
          totalWithdrawn += BigInt(event.args.amount || 0);
        }
      });
    }

    const tipRevenueSTT = formatEther(totalTipRevenue);
    const forkRevenueSTT = formatEther(totalForkRevenue);
    const totalRevenueSTT = formatEther(totalTipRevenue + totalForkRevenue);
    const withdrawnAmountSTT = formatEther(totalWithdrawn);

    return {
      tipRevenue: tipRevenueSTT,
      forkRevenue: forkRevenueSTT,
      totalRevenue: totalRevenueSTT,
      withdrawnAmount: withdrawnAmountSTT,
    };
  }, [address, storyRewardEvents, chapterRewardEvents, withdrawEvents, forkEvents]);

  // 加载数据当地址变化时
  useEffect(() => {
    if (address) {
      loadUserData(address);
    } else {
      // 清空数据和状态
      setUserStories([]);
      setUserChapters([]);
      setUserStats({
        totalStories: 0,
        totalChapters: 0,
        totalLikes: 0,
        totalTips: "0",
        totalForks: 0,
      });
      setLoadingState({
        isLoading: false,
        error: null,
        lastLoadTime: 0,
      });
    }
  }, [address, loadUserData]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 点赞成功后的回调函数，使用防抖
  const handleLikeSuccess = useCallback(() => {
    setTimeout(() => {
      if (address && !loadingState.isLoading) {
        loadUserData(address, true); // 强制刷新
      }
    }, 500); // 500ms 延迟
  }, [address, loadingState.isLoading, loadUserData]);

  // 手动刷新数据
  const handleRefresh = useCallback(() => {
    if (address) {
      loadUserData(address, true);
    }
  }, [address, loadUserData]);

  const handleWithdrawRewards = async () => {
    try {
      await withdrawRewards();
    } catch {
      // 错误处理已在 useStoryChain 中处理
    }
  };

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <div className="alert alert-info">
          <UserIcon className="w-6 h-6" />
          <span>请先连接钱包查看个人中心</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 用户信息卡片 */}
      <div className="card bg-gradient-to-r from-primary/20 to-accent/20 shadow-xl mb-8">
        <div className="card-body">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-16 h-16">
                  <UserIcon className="w-8 h-8" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">我的创作中心</h1>
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <span>地址:</span>
                  <Address address={address} />
                </div>
              </div>
            </div>

            {/* 待提取奖励 */}
            {parseFloat(pendingRewards) > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-base-content/70">待提取奖励</div>
                  <div className="text-xl font-bold text-success">{parseFloat(pendingRewards).toFixed(4)} STT</div>
                </div>
                <button onClick={handleWithdrawRewards} className="btn btn-success gap-2" disabled={isLoading}>
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  )}
                  提取
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-primary">
            <BookOpenIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">故事</div>
          <div className="stat-value text-primary">{userStats.totalStories}</div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-secondary">
            <DocumentTextIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">章节</div>
          <div className="stat-value text-secondary">{userStats.totalChapters}</div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-accent">
            <HeartIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">获赞</div>
          <div className="stat-value text-accent">{userStats.totalLikes}</div>
        </div>

        <div className="stat bg-base-100 rounded-lg shadow-md">
          <div className="stat-figure text-warning">
            <ShareIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">被分叉</div>
          <div className="stat-value text-warning">{userStats.totalForks}</div>
        </div>
      </div>

      {/* 标签页和刷新按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="tabs tabs-boxed bg-base-100 shadow-md">
          <button
            onClick={() => setActiveTab("stories")}
            className={`tab tab-lg ${activeTab === "stories" ? "tab-active" : ""}`}
          >
            <BookOpenIcon className="w-4 h-4 mr-2" />
            我的故事
          </button>
          <button
            onClick={() => setActiveTab("chapters")}
            className={`tab tab-lg ${activeTab === "chapters" ? "tab-active" : ""}`}
          >
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            我的章节
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`tab tab-lg ${activeTab === "stats" ? "tab-active" : ""}`}
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            统计信息
          </button>
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={loadingState.isLoading}
          className="btn btn-outline btn-sm gap-2"
          title="刷新数据"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loadingState.isLoading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {/* 内容区域 */}
      <div className="min-h-[400px]">
        {/* 错误状态 */}
        {loadingState.error && (
          <div className="alert alert-error mb-6">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <div>
              <div className="font-bold">加载失败</div>
              <div className="text-sm">{loadingState.error}</div>
            </div>
            <button onClick={handleRefresh} className="btn btn-sm btn-outline">
              重试
            </button>
          </div>
        )}

        {loadingState.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card bg-base-100 shadow-md animate-pulse">
                <div className="card-body">
                  <div className="h-6 bg-base-300 rounded w-3/4 mb-4"></div>
                  <div className="h-16 bg-base-300 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-base-300 rounded w-1/3"></div>
                    <div className="h-4 bg-base-300 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loadingState.error ? (
          <>
            {/* 我的故事 */}
            {activeTab === "stories" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">我的故事 ({userStories.length})</h2>
                  <Link href="/create" className="btn btn-primary gap-2">
                    <PlusIcon className="w-4 h-4" />
                    创建新故事
                  </Link>
                </div>

                {userStories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userStories.map(story => (
                      <div key={story.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                        <div className="card-body">
                          <h3 className="card-title text-lg line-clamp-2">{story.title}</h3>

                          <div className="flex items-center gap-2 text-sm text-base-content/70">
                            <ClockIcon className="w-4 h-4" />
                            <span>{new Date(story.createdTime).toLocaleDateString()}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 text-sm">
                              <LikeButton
                                tokenId={BigInt(story.id)}
                                isStory={true}
                                currentLikes={story.likes}
                                className="text-xs"
                                onLikeSuccess={handleLikeSuccess}
                              />
                              <span className="flex items-center gap-1">
                                <ShareIcon className="w-4 h-4" />
                                {story.forkCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <CurrencyDollarIcon className="w-4 h-4" />
                                {parseFloat(formatEther(BigInt(story.totalTips || "0"))).toFixed(4)} STT
                              </span>
                            </div>

                            <div className="card-actions">
                              <Link href={`/story/${story.id}`} className="btn btn-primary btn-sm">
                                查看
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <BookOpenIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">还没有创建故事</h3>
                    <p className="text-base-content/70 mb-6">开始你的第一个创作吧！</p>
                    <Link href="/create" className="btn btn-primary gap-2">
                      <PlusIcon className="w-4 h-4" />
                      创建故事
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 我的章节 */}
            {activeTab === "chapters" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">我的章节 ({userChapters.length})</h2>

                {userChapters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userChapters.map(chapter => (
                      <div key={chapter.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                        <div className="card-body">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="card-title text-lg line-clamp-2">{chapter.title}</h3>
                            <div className="badge badge-primary badge-sm">第{chapter.chapterNumber}章</div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-base-content/70">
                            <ClockIcon className="w-4 h-4" />
                            <span>{new Date(chapter.createdTime).toLocaleDateString()}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 text-sm">
                              <LikeButton
                                tokenId={BigInt(chapter.id)}
                                isStory={false}
                                currentLikes={chapter.likes}
                                className="text-xs"
                                onLikeSuccess={handleLikeSuccess}
                              />
                              <span className="flex items-center gap-1">
                                <ShareIcon className="w-4 h-4" />
                                {chapter.forkCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <CurrencyDollarIcon className="w-4 h-4" />
                                {parseFloat(formatEther(BigInt(chapter.totalTips || "0"))).toFixed(4)} STT
                              </span>
                            </div>

                            <div className="card-actions">
                              <Link href={`/story/${chapter.storyId}`} className="btn btn-primary btn-sm">
                                查看故事
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <DocumentTextIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">还没有创建章节</h3>
                    <p className="text-base-content/70 mb-6">为你的故事或他人的故事添加章节吧！</p>
                    <Link href="/explore" className="btn btn-primary gap-2">
                      <BookOpenIcon className="w-4 h-4" />
                      探索故事
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 统计信息 */}
            {activeTab === "stats" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">详细统计</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 创作统计 */}
                  <div className="card bg-base-100 shadow-md">
                    <div className="card-body">
                      <h3 className="card-title">创作统计</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>总故事数</span>
                          <span className="font-bold">{userStats.totalStories}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>总章节数</span>
                          <span className="font-bold">{userStats.totalChapters}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>平均章节/故事</span>
                          <span className="font-bold">
                            {userStats.totalStories > 0
                              ? (userStats.totalChapters / userStats.totalStories).toFixed(1)
                              : "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 互动统计 */}
                  <div className="card bg-base-100 shadow-md">
                    <div className="card-body">
                      <h3 className="card-title">互动统计</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>总点赞数</span>
                          <span className="font-bold text-error">{userStats.totalLikes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>被分叉次数</span>
                          <span className="font-bold text-warning">{userStats.totalForks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>待提取奖励</span>
                          <span className="font-bold text-success">{pendingRewards} STT</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 收益统计 */}
                  <div className="card bg-base-100 shadow-md md:col-span-2">
                    <div className="card-body">
                      <h3 className="card-title">收益统计</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="stat">
                          <div className="stat-title">打赏收益</div>
                          <div className="stat-value text-sm">
                            {parseFloat(calculatedRevenueStats.tipRevenue).toFixed(6)} STT
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">分叉收益</div>
                          <div className="stat-value text-sm">
                            {parseFloat(calculatedRevenueStats.forkRevenue).toFixed(6)} STT
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">总收益</div>
                          <div className="stat-value text-sm">
                            {parseFloat(calculatedRevenueStats.totalRevenue).toFixed(6)} STT
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">已提取</div>
                          <div className="stat-value text-sm">
                            {parseFloat(calculatedRevenueStats.withdrawnAmount).toFixed(6)} STT
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ProfilePage;
