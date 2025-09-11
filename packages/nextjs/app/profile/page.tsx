"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowDownTrayIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HeartIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { IPFSPreview } from "~~/components/ipfs/IPFSViewer";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useStoryChain } from "~~/hooks/useStoryChain";
import { getJSONFromIPFS } from "~~/services/ipfs/ipfsService";

// Global flag to prevent infinite API calls
let GLOBAL_LOADING_LOCK = false;

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
  const [revenueStats, setRevenueStats] = useState({
    tipRevenue: "0",
    forkRevenue: "0",
    totalRevenue: "0",
    withdrawnAmount: "0",
  });
  const [loading, setLoading] = useState(true);
  
  // Aggressive protection against infinite calls
  const isLoadingRef = useRef(false);

  // Temporarily disable event history hooks to prevent infinite loops
  // TODO: Re-enable these when implementing advanced revenue calculations
  /*
  const { data: storyRewardEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "StoryRewardsDistributed",
    fromBlock: 0n,
  });

  const { data: chapterRewardEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "ChapterRewardsDistributed",
    fromBlock: 0n,
  });

  const { data: withdrawEvents } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "RewardsWithdrawn",
    fromBlock: 0n,
  });
  */

  const loadUserData = async (targetAddress: string) => {
    if (!targetAddress || loading || isLoadingRef.current || GLOBAL_LOADING_LOCK) {
      console.log("🚫 BLOCKED API CALL - loadUserData blocked by locks");
      return;
    }

    try {
      console.log("🔓 STARTING API CALL - setting all locks");
      isLoadingRef.current = true;
      GLOBAL_LOADING_LOCK = true;
      setLoading(true);

      // Initialize arrays
      const stories: UserStory[] = [];
      const chapters: UserChapter[] = [];

      // Load stories
      try {
        console.log("📡 Fetching stories for", targetAddress);
        const storiesRes = await fetch(`/api/data/stories?author=${targetAddress}`);
        if (storiesRes.ok) {
          const storiesData = await storiesRes.json();
          if (storiesData.stories) {
            for (const storyData of storiesData.stories) {
              try {
                let metadata = null;
                let title = `故事 #${storyData.id}`;

                if (storyData.ipfsHash) {
                  try {
                    metadata = await getJSONFromIPFS(storyData.ipfsHash);
                    title = metadata?.title || metadata?.name || title;
                  } catch (error) {
                    console.error("加载故事元数据失败:", error);
                  }
                }

                stories.push({
                  id: storyData.id,
                  title: title,
                  ipfsHash: storyData.ipfsHash,
                  createdTime: storyData.createdTime * 1000,
                  likes: Number(storyData.likes) || 0,
                  forkCount: Number(storyData.forkCount) || 0,
                  totalTips: storyData.totalTips || "0",
                  metadata,
                });
              } catch (error) {
                console.error("处理故事数据失败:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("获取用户故事失败:", error);
      }

      // Load chapters
      try {
        console.log("📡 Fetching chapters for", targetAddress);
        const chaptersRes = await fetch(`/api/data/chapters?author=${targetAddress}`);
        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          if (chaptersData.chapters) {
            for (const chapterData of chaptersData.chapters) {
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
                    console.error("加载章节元数据失败:", error);
                  }
                }

                chapters.push({
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
                });
              } catch (error) {
                console.error("处理章节数据失败:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("获取用户章节失败:", error);
      }

      // Update state
      setUserStories(stories);
      setUserChapters(chapters);

      // Calculate stats
      const totalStories = stories.length;
      const totalChapters = chapters.length;
      const totalLikes =
        stories.reduce((sum: number, story: UserStory) => sum + story.likes, 0) +
        chapters.reduce((sum: number, chapter: UserChapter) => sum + chapter.likes, 0);

      const totalTipsValue =
        stories.reduce((sum: number, story: UserStory) => sum + parseFloat(story.totalTips), 0) +
        chapters.reduce((sum: number, chapter: UserChapter) => sum + parseFloat(chapter.totalTips), 0);

      const totalForks =
        stories.reduce((sum: number, story: UserStory) => sum + story.forkCount, 0) +
        chapters.reduce((sum: number, chapter: UserChapter) => sum + chapter.forkCount, 0);

      const stats: UserStats = {
        totalStories,
        totalChapters,
        totalLikes,
        totalTips: totalTipsValue.toString(),
        totalForks,
      };
      setUserStats(stats);

      console.log("✅ API CALL COMPLETED - releasing locks");

    } catch (error) {
      console.error("加载用户数据失败:", error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      // Clear global lock after a delay to prevent rapid successive calls
      setTimeout(() => {
        GLOBAL_LOADING_LOCK = false;
        console.log("🔓 GLOBAL LOCK RELEASED");
      }, 1000);
    }
  };

  // Use memoization for revenue calculations to prevent unnecessary recalculations
  const calculatedRevenueStats = useMemo(() => {
    if (!address) {
      return {
        tipRevenue: "0",
        forkRevenue: "0",
        totalRevenue: "0",
        withdrawnAmount: "0",
      };
    }

    // Only calculate tip revenue (from API data)
    const tipRevenue =
      userStories.reduce((sum: number, story: UserStory) => sum + parseFloat(story.totalTips || "0"), 0) +
      userChapters.reduce((sum: number, chapter: UserChapter) => sum + parseFloat(chapter.totalTips || "0"), 0);

    return {
      tipRevenue: tipRevenue.toString(),
      forkRevenue: "0", // Temporarily disabled
      totalRevenue: tipRevenue.toString(),
      withdrawnAmount: "0", // Temporarily disabled
    };
  }, [address, userStories, userChapters]);

  // Update revenue stats when calculated values change
  useEffect(() => {
    setRevenueStats(calculatedRevenueStats);
  }, [calculatedRevenueStats]);

  // Load data when address changes or on mount
  useEffect(() => {
    console.log("🚨 PROFILE useEffect triggered - TEMPORARILY DISABLED");
    return; // EMERGENCY FIX: Completely disable data loading to stop infinite calls
    
    if (address) {
      loadUserData(address);
    } else {
      setLoading(false);
    }
  }, [address]);

  // 点赞成功后的回调函数，使用防抖来避免频繁调用
  const handleLikeSuccess = useCallback(() => {
    console.log("🚨 LIKE SUCCESS callback triggered - TEMPORARILY DISABLED");
    return; // EMERGENCY FIX: Disable like success reload to prevent API calls
    
    // Use setTimeout to debounce rapid successive calls
    setTimeout(() => {
      if (address && !loading && !isLoadingRef.current) {
        loadUserData(address);
      }
    }, 300); // 300ms delay to debounce rapid calls
  }, [address, loading]);

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
                  <div className="text-xl font-bold text-success">{parseFloat(pendingRewards).toFixed(4)} ETH</div>
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

      {/* 标签页 */}
      <div className="tabs tabs-boxed mb-6 bg-base-100 shadow-md">
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

      {/* 内容区域 */}
      <div className="min-h-[400px]">
        {loading ? (
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
        ) : (
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

                          <div className="flex-1">
                            <IPFSPreview cid={story.ipfsHash} maxLines={3} />
                          </div>

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
                                {parseFloat(story.totalTips).toFixed(3)}
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

                          <div className="flex-1">
                            <IPFSPreview cid={chapter.ipfsHash} maxLines={3} />
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
                          <span className="font-bold text-success">{pendingRewards} ETH</span>
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
                          <div className="stat-value text-sm">{parseFloat(revenueStats.tipRevenue).toFixed(6)} ETH</div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">分叉收益</div>
                          <div className="stat-value text-sm">
                            {parseFloat(revenueStats.forkRevenue).toFixed(6)} ETH
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">总收益</div>
                          <div className="stat-value text-sm">
                            {parseFloat(revenueStats.totalRevenue).toFixed(6)} ETH
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">已提取</div>
                          <div className="stat-value text-sm">
                            {parseFloat(revenueStats.withdrawnAmount).toFixed(6)} ETH
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
