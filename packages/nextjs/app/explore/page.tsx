"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  BookOpenIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { Address } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getJSONFromIPFS } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

interface StoryData {
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
  metadata?: any;
}

const StoryCard: React.FC<{ story: StoryData }> = ({ story }) => {
  const { t } = useLanguage();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const data = await getJSONFromIPFS(story.ipfsHash);
        setMetadata(data);
      } catch (error) {
        console.error("加载故事元数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    if (story.ipfsHash) {
      loadMetadata();
    }
  }, [story.ipfsHash]);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg animate-pulse">
        <div className="card-body">
          <div className="h-6 bg-base-300 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-base-300 rounded w-full"></div>
            <div className="h-4 bg-base-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
      <div className="card-body">
        {/* 标题和作者 */}
        <div className="flex justify-between items-start mb-3">
          <h2 className="card-title text-lg font-bold line-clamp-2">
            {metadata?.name || `故事 #${story.id.toString()}`}
          </h2>
          <div className="badge badge-secondary badge-sm">#{story.id.toString()}</div>
        </div>

        {/* 作者和创建时间 */}
        <div className="flex items-center gap-4 text-sm text-base-content/70 mb-3">
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <Address address={story.author} size="sm" />
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(Number(story.createdTime) * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        {/* 故事预览 */}
        {metadata?.description && <p className="text-base-content/80 mb-4 line-clamp-3">{metadata.description}</p>}

        {/* 标签 */}
        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {metadata.tags.slice(0, 3).map((tag: string, index: number) => (
              <span key={index} className="badge badge-outline badge-sm">
                {tag}
              </span>
            ))}
            {metadata.tags.length > 3 && (
              <span className="badge badge-outline badge-sm">+{metadata.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <LikeButton tokenId={story.id} isStory={true} currentLikes={Number(story.likes)} showCount={true} />

            <div className="flex items-center gap-1 text-base-content/70">
              <ShareIcon className="w-4 h-4" />
              <span>{story.forkCount.toString()}</span>
            </div>

            <div className="flex items-center gap-1 text-base-content/70">
              <CurrencyDollarIcon className="w-4 h-4" />
              <span>{(Number(story.totalTips) / 1e18).toFixed(3)} ETH</span>
            </div>
          </div>

          <div className="text-xs text-base-content/60">分叉费: {(Number(story.forkFee) / 1e18).toFixed(3)} ETH</div>
        </div>

        {/* 操作按钮 */}
        <div className="card-actions justify-end mt-4">
          <Link href={`/story/${story.id}`} className="btn btn-primary btn-sm gap-1">
            <BookOpenIcon className="w-4 h-4" />
            {t("story.read", "阅读")}
          </Link>
        </div>
      </div>
    </div>
  );
};

const ExplorePage = () => {
  const { t } = useLanguage();
  const { address } = useAccount();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "tips">("newest");
  const [stories, setStories] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取故事总数
  const { data: totalStories } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "stories",
    args: [BigInt(0)],
  });

  // 点赞故事
  // const { writeContractAsync: likeStory } = useScaffoldWriteContract("StoryChain");

  // 获取所有故事
  useEffect(() => {
    const loadStories = async () => {
      if (!totalStories) return;

      try {
        setLoading(true);
        const storyPromises = [];

        // 假设我们有一些故事，从合约中获取
        for (let i = 1; i <= Math.min(Number(totalStories), 20); i++) {
          storyPromises
            .push
            // 这里应该调用 getStory(i)，但由于合约结构，我们需要其他方式获取故事列表
            // 暂时创建模拟数据
            ();
        }

        // 暂时使用空数组，实际应用中需要从合约事件或其他方式获取故事列表
        setStories([]);
      } catch (error) {
        console.error("加载故事失败:", error);
        notification.error("加载故事失败");
      } finally {
        setLoading(false);
      }
    };

    loadStories();
  }, [totalStories]);

  const filteredStories = stories.filter(story => {
    if (!searchTerm) return true;
    return (
      story.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const sortedStories = [...filteredStories].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return Number(b.likes) - Number(a.likes);
      case "tips":
        return Number(b.totalTips) - Number(a.totalTips);
      default: // newest
        return Number(b.createdTime) - Number(a.createdTime);
    }
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("nav.explore")}</h1>
        <p className="text-base-content/70">探索社区创作的精彩故事，发现无限的创意可能性</p>
      </div>

      {/* 搜索和筛选 */}
      <div className="card bg-base-100 shadow-lg mb-8">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="form-control flex-1">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="搜索故事标题或描述..."
                  className="input input-bordered w-full"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-square">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="form-control">
              <div className="input-group">
                <label className="input-group-text">
                  <FunnelIcon className="w-4 h-4" />
                </label>
                <select
                  className="select select-bordered"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                >
                  <option value="newest">最新创建</option>
                  <option value="popular">最受欢迎</option>
                  <option value="tips">最多打赏</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 故事列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card bg-base-100 shadow-lg animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-base-300 rounded w-full"></div>
                  <div className="h-4 bg-base-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedStories.map(story => (
            <StoryCard key={story.id.toString()} story={story} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpenIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">还没有故事</h3>
          <p className="text-base-content/70 mb-6">{searchTerm ? "没有找到匹配的故事" : "成为第一个创建故事的人！"}</p>
          <Link href="/create" className="btn btn-primary gap-2">
            <BookOpenIcon className="w-4 h-4" />
            {t("story.create")}
          </Link>
        </div>
      )}

      {/* 创建按钮 */}
      <div className="fixed bottom-6 right-6">
        <Link
          href="/create"
          className="btn btn-primary btn-circle btn-lg shadow-lg hover:shadow-xl transition-shadow"
          title={t("story.create")}
        >
          <BookOpenIcon className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
};

export default ExplorePage;
