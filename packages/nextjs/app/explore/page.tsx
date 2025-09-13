"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import ErrorBoundary from "~~/components/ErrorBoundary";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { Address } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useStories } from "~~/hooks/useChainData";
import { StoryData } from "~~/lib/monitoring/types";
import { getJSONFromIPFS } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

interface StoryMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  content?: string;
  image?: string; // 封面图片IPFS哈希
}

interface StoryWithMetadata extends StoryData {
  metadata?: StoryMetadata;
}

// 故事封面组件
const StoryCover: React.FC<{
  image?: string;
  title: string;
  storyId: string;
  className?: string;
}> = ({ image, title, storyId, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!image);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 获取显示文字（取标题的前几个字或故事ID）
  const getDisplayText = (title: string, storyId: string) => {
    if (title && title.trim()) {
      // 中文取前2个字，英文取前4个字母
      const isChinese = /[一-龥]/.test(title);
      return isChinese ? title.substring(0, 2) : title.substring(0, 4).toUpperCase();
    }
    return `#${storyId}`;
  };

  const displayText = getDisplayText(title, storyId);

  if (!image || imageError) {
    return (
      <div
        className={`${className} bg-slate-500 flex items-center justify-center text-white font-bold text-lg relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <span className="relative z-10">{displayText}</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-base-200`}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-500">
          <div className="loading loading-spinner loading-sm text-white"></div>
        </div>
      )}
      <img
        src={`https://gateway.pinata.cloud/ipfs/${image}`}
        alt={title || `故事 #${storyId}`}
        className="w-full h-full object-cover"
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
      {imageError && (
        <div className="absolute inset-0 bg-slate-500 flex items-center justify-center text-white font-bold text-lg">
          <div className="absolute inset-0 bg-black/10"></div>
          <span className="relative z-10">{displayText}</span>
        </div>
      )}
    </div>
  );
};

const StoryCard: React.FC<{ story: StoryWithMetadata; onMetadataLoad?: (metadata: StoryMetadata) => void }> = ({
  story,
  onMetadataLoad,
}) => {
  const [metadata, setMetadata] = useState<StoryMetadata | null>(story.metadata || null);
  const [loading, setLoading] = useState(!story.metadata);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadMetadata = useCallback(async () => {
    if (!story.ipfsHash) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getJSONFromIPFS(story.ipfsHash);
      const validatedMetadata: StoryMetadata = {
        title: data?.title || undefined,
        description: data?.description || undefined,
        tags: Array.isArray(data?.tags) ? data.tags : undefined,
        content: data?.content || undefined,
        image: data?.image || undefined,
      };
      setMetadata(validatedMetadata);
      // 使用 ref 来调用 onMetadataLoad，避免依赖问题
      if (onMetadataLoadRef.current) {
        onMetadataLoadRef.current(validatedMetadata);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      console.error("加载故事元数据失败:", err);
      setError(`加载故事信息失败: ${errorMessage}`);
      notification.error(`故事 #${story.id} 元数据加载失败`);
    } finally {
      setLoading(false);
    }
  }, [story.ipfsHash, story.id]); // 移除 onMetadataLoad 依赖

  // 使用 useRef 来存储 onMetadataLoad，避免依赖问题
  const onMetadataLoadRef = useRef(onMetadataLoad);
  onMetadataLoadRef.current = onMetadataLoad;

  useEffect(() => {
    if (!metadata && story.ipfsHash) {
      loadMetadata();
    } else if (!story.ipfsHash) {
      setLoading(false);
    }
  }, [loadMetadata, story.ipfsHash, retryCount]); // 重新添加 loadMetadata 依赖

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg animate-pulse">
        {/* 封面 skeleton */}
        <div className="h-48 bg-base-300 rounded-t-lg"></div>

        <div className="card-body">
          {/* Title and badge skeleton */}
          <div className="flex justify-between items-start mb-3">
            <div className="h-6 bg-base-300 rounded w-3/4"></div>
            <div className="h-5 w-8 bg-base-300 rounded-full"></div>
          </div>

          {/* Author and time skeleton */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-base-300 rounded"></div>
              <div className="h-4 bg-base-300 rounded w-20"></div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-base-300 rounded"></div>
              <div className="h-4 bg-base-300 rounded w-16"></div>
            </div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-base-300 rounded w-full"></div>
            <div className="h-4 bg-base-300 rounded w-2/3"></div>
            <div className="h-4 bg-base-300 rounded w-1/2"></div>
          </div>

          {/* Tags skeleton */}
          <div className="flex gap-2 mb-4">
            <div className="h-5 bg-base-300 rounded-full w-12"></div>
            <div className="h-5 bg-base-300 rounded-full w-16"></div>
            <div className="h-5 bg-base-300 rounded-full w-10"></div>
          </div>

          {/* Stats skeleton */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-base-300 rounded"></div>
                <div className="h-4 bg-base-300 rounded w-8"></div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-base-300 rounded"></div>
                <div className="h-4 bg-base-300 rounded w-6"></div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-base-300 rounded"></div>
                <div className="h-4 bg-base-300 rounded w-12"></div>
              </div>
            </div>
          </div>

          {/* Button skeleton */}
          <div className="card-actions justify-end">
            <div className="h-8 bg-base-300 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-lg border border-error/20 overflow-hidden">
        {/* 即使出错也显示封面（使用文字封面） */}
        <StoryCover
          image={undefined} // 强制使用文字封面
          title={`故事 #${story.id}`}
          storyId={story.id}
          className="h-48 w-full"
        />

        <div className="card-body">
          <div className="flex justify-between items-start mb-3">
            <h2 className="card-title text-lg font-bold">故事 #{story.id}</h2>
            <div className="badge badge-secondary badge-sm">#{story.id}</div>
          </div>

          <div className="alert alert-error alert-sm mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs">{error}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-base-content/70 mb-3">
            <div className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" />
              <Address address={story.author} size="sm" />
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{new Date(story.createdTime * 1000).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="card-actions justify-between mt-4">
            <button
              className="btn btn-outline btn-sm gap-1"
              onClick={() => {
                setRetryCount(prev => prev + 1);
                loadMetadata();
              }}
            >
              重试加载
            </button>
            <Link href={`/story/${story.id}`} className="btn btn-primary btn-sm gap-1">
              <BookOpenIcon className="w-4 h-4" />
              阅读
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
      {/* 故事封面 */}
      <StoryCover
        image={metadata?.image}
        title={metadata?.title || `故事 #${story.id}`}
        storyId={story.id}
        className="h-48 w-full"
      />

      <div className="card-body">
        {/* 标题和作者 */}
        <div className="flex justify-between items-start mb-3">
          <h2 className="card-title text-lg font-bold line-clamp-2">{metadata?.title || `故事 #${story.id}`}</h2>
          <div className="badge badge-secondary badge-sm">#{story.id}</div>
        </div>

        {/* 作者和创建时间 */}
        <div className="flex items-center gap-4 text-sm text-base-content/70 mb-3">
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <Address address={story.author} size="sm" />
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(story.createdTime * 1000).toLocaleDateString()}</span>
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
            <LikeButton tokenId={BigInt(story.id)} isStory={true} currentLikes={story.likes} showCount={true} />

            <div className="flex items-center gap-1 text-base-content/70">
              <ShareIcon className="w-4 h-4" />
              <span>{story.forkCount}</span>
            </div>

            <div className="flex items-center gap-1 text-base-content/70">
              <CurrencyDollarIcon className="w-4 h-4" />
              <span>{(Number(story.totalTips) / 1e18).toFixed(3)} STT</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="card-actions justify-end mt-4">
          <Link href={`/story/${story.id}`} className="btn btn-primary btn-sm gap-1">
            <BookOpenIcon className="w-4 h-4" />
            阅读
          </Link>
        </div>
      </div>
    </div>
  );
};

const ExplorePage = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"createdTime" | "likes" | "totalTips">("createdTime");
  const [sortOrder] = useState<"asc" | "desc">("desc"); // Keep for potential future use
  const [storiesMetadata, setStoriesMetadata] = useState<Map<string, StoryMetadata>>(new Map());

  // 使用 useMemo 稳定化 filters 对象引用
  const filters = useMemo(
    () => ({
      sortBy,
      sortOrder,
      limit: 50, // 获取更多数据以支持前端筛选
    }),
    [sortBy, sortOrder],
  );

  // 使用 useStories hook 获取数据
  const { data: storiesResponse, loading, error, refetch } = useStories(filters);

  const stories = storiesResponse?.data || [];

  // 为每个故事添加 metadata 字段以支持类型检查
  const storiesWithMetadata: StoryWithMetadata[] = stories.map(story => {
    const metadata = storiesMetadata.get(story.id) || undefined;
    return {
      ...story,
      metadata,
    };
  });

  // 处理元数据加载
  const handleMetadataLoad = useCallback((storyId: string, metadata: StoryMetadata) => {
    setStoriesMetadata(prev => new Map(prev.set(storyId, metadata)));
  }, []);

  // 客户端筛选（基于搜索词）
  const filteredStories = storiesWithMetadata.filter(story => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // 搜索故事ID
    if (story.id.includes(searchTerm)) return true;

    // 搜索作者地址
    if (story.author.toLowerCase().includes(searchLower)) return true;

    // 搜索元数据（如果已加载）
    if (story.metadata) {
      const { title, description, tags } = story.metadata;

      if (title?.toLowerCase().includes(searchLower)) return true;
      if (description?.toLowerCase().includes(searchLower)) return true;
      if (tags?.some(tag => tag.toLowerCase().includes(searchLower))) return true;
    }

    return false;
  });

  // 本地排序（如果需要的话）
  const sortedStories = [...filteredStories].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortBy) {
      case "likes":
        aValue = Number(a.likes) || 0;
        bValue = Number(b.likes) || 0;
        break;
      case "totalTips":
        aValue = Number(a.totalTips) || 0;
        bValue = Number(b.totalTips) || 0;
        break;
      default: // createdTime
        aValue = Number(a.createdTime) || 0;
        bValue = Number(b.createdTime) || 0;
    }

    // Descending order by default (newer/higher values first)
    return bValue - aValue;
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
                  <option value="createdTime">最新创建</option>
                  <option value="likes">最受欢迎</option>
                  <option value="totalTips">最多打赏</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 故事列表 */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>加载故事失败: {error}</span>
          <button className="btn btn-sm" onClick={refetch}>
            重试
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {/* Loading message */}
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
            <p className="text-base-content/70">正在加载故事...</p>
          </div>

          {/* Skeleton grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card bg-base-100 shadow-lg animate-pulse">
                {/* 封面 skeleton */}
                <div className="h-48 bg-base-300 rounded-t-lg"></div>

                <div className="card-body">
                  {/* Title and badge skeleton */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-6 bg-base-300 rounded w-3/4"></div>
                    <div className="h-5 w-8 bg-base-300 rounded-full"></div>
                  </div>

                  {/* Author and time skeleton */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-base-300 rounded"></div>
                      <div className="h-4 bg-base-300 rounded w-20"></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-base-300 rounded"></div>
                      <div className="h-4 bg-base-300 rounded w-16"></div>
                    </div>
                  </div>

                  {/* Description skeleton */}
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-base-300 rounded w-full"></div>
                    <div className="h-4 bg-base-300 rounded w-2/3"></div>
                  </div>

                  {/* Tags skeleton */}
                  <div className="flex gap-2 mb-4">
                    <div className="h-5 bg-base-300 rounded-full w-12"></div>
                    <div className="h-5 bg-base-300 rounded-full w-16"></div>
                  </div>

                  {/* Stats skeleton */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-base-300 rounded"></div>
                        <div className="h-4 bg-base-300 rounded w-8"></div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-base-300 rounded"></div>
                        <div className="h-4 bg-base-300 rounded w-6"></div>
                      </div>
                    </div>
                  </div>

                  {/* Button skeleton */}
                  <div className="card-actions justify-end">
                    <div className="h-8 bg-base-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : sortedStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedStories.map(story => (
            <ErrorBoundary key={`boundary-${story.id}`}>
              <StoryCard
                key={story.id}
                story={story}
                onMetadataLoad={metadata => handleMetadataLoad(story.id, metadata)}
              />
            </ErrorBoundary>
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
