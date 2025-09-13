"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ClockIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CommentSection } from "~~/components/interactions/CommentSection";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { ImageUploader } from "~~/components/ipfs/IPFSUploader";
import { Address } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { ChapterData } from "~~/lib/monitoring/types";
import { type ChapterMetadata, getJSONFromIPFS, uploadChapterMetadata } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

interface StoryMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  content?: string;
  image?: string; // 封面图片IPFS哈希
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
        className={`${className} bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <span className="relative z-10">{displayText}</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-base-200`}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <div className="loading loading-spinner loading-lg text-white"></div>
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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <span className="relative z-10">{displayText}</span>
        </div>
      )}
    </div>
  );
};

interface ChapterWithMetadata extends ChapterData {
  metadata?: any;
}

// 分叉选择器组件
const ForkSelector: React.FC<{
  parentChapter: ChapterWithMetadata;
  forks: ChapterWithMetadata[];
  onSelectFork: (forkId: string) => void;
}> = ({ parentChapter, forks, onSelectFork }) => {
  if (forks.length <= 1) return null;

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-warning/10 to-info/10 border border-warning/30 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <ShareIcon className="w-6 h-6 text-warning" />
        <h4 className="text-lg font-bold text-warning">故事在此分叉</h4>
        <div className="badge badge-warning">{forks.length} 个分支</div>
      </div>
      <p className="text-base-content/80 mb-6 text-sm leading-relaxed">
        第 {parentChapter.chapterNumber} 章之后有 {forks.length}{" "}
        个不同的发展方向，每个分支都带来不同的故事体验。选择你感兴趣的分支继续阅读：
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {forks.map((fork, index) => (
          <button
            key={fork.id}
            onClick={() => onSelectFork(fork.id)}
            className="text-left p-4 border-2 border-base-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center font-bold text-sm">
                  {String.fromCharCode(65 + index)}
                </div>
                <h5 className="font-bold text-primary group-hover:text-primary-focus">第 {fork.chapterNumber} 章</h5>
              </div>
              <div className="text-xs text-base-content/60 flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <Address address={fork.author} size="sm" />
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-base-content/50">点击阅读详细内容</div>
            </div>
            <div className="flex justify-between items-center text-xs text-base-content/60">
              <span>{new Date(fork.createdTime * 1000).toLocaleDateString()}</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span>👍</span>
                  <span className="font-medium">{fork.likes}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CurrencyDollarIcon className="w-3 h-3" />
                  <span className="font-medium">{formatEther(BigInt(fork.totalTips))} ETH</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChapterCard: React.FC<{
  chapter: ChapterWithMetadata;
  onFork: (chapterId: string) => void;
  onTip: (storyId: string, chapterId: string) => void;
  onContinue: (chapterId: string) => void;
  forks?: ChapterWithMetadata[];
  onSelectFork?: (forkId: string) => void;
  allChapters: ChapterWithMetadata[];
  canUserContinueChapter: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => boolean;
  getContinueButtonTooltip: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => string;
}> = ({ chapter, onFork, onTip, onContinue, forks = [], onSelectFork, allChapters, canUserContinueChapter, getContinueButtonTooltip }) => {
  const { address } = useAccount();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!chapter.ipfsHash) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const data = await getJSONFromIPFS(chapter.ipfsHash, 4); // Increase retry attempts for new chapters
        setMetadata(data);
      } catch (error) {
        console.error(`❌ Failed to load metadata for chapter ${chapter.id}:`, error);
        setError(error instanceof Error ? error.message : "加载章节元数据失败");

        // Auto-retry for new chapters (likely IPFS sync issue)
        const isRecentChapter = Date.now() - (chapter.createdTime * 1000) < 300000; // 5 minutes
        if (isRecentChapter && !retrying) {
          console.log(`⏳ Auto-retrying metadata load for recent chapter ${chapter.id} in 5 seconds...`);
          setRetrying(true);
          setTimeout(() => {
            setRetrying(false);
            loadMetadata(); // Retry once more
          }, 5000);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [chapter.ipfsHash, chapter.id, chapter.createdTime, retrying]);

  if (loading || retrying) {
    return (
      <div className="card bg-base-100 shadow-lg animate-pulse">
        <div className="card-body">
          <div className="h-6 bg-base-300 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-base-300 rounded w-full"></div>
            <div className="h-4 bg-base-300 rounded w-2/3"></div>
          </div>
          {retrying && (
            <div className="text-center mt-4">
              <div className="loading loading-spinner loading-sm"></div>
              <div className="text-sm text-base-content/70 mt-2">正在重新加载章节信息...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all border-l-4 border-primary rounded-lg overflow-hidden">
      <div className="card-body p-6">
        {/* 章节标题和编号 */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="card-title text-xl font-bold text-primary mb-2">第 {chapter.chapterNumber} 章</h3>
            {metadata?.title ? (
              <h4 className="text-lg font-semibold text-base-content/90 mb-2">{metadata.title}</h4>
            ) : error ? (
              <div className="text-sm text-warning mb-2">
                <div className="flex items-center gap-2">
                  <span>⚠️ 章节标题加载中...</span>
                  <button
                    onClick={() => {
                      setRetrying(true);
                      setLoading(true);
                    }}
                    className="btn btn-xs btn-ghost"
                    title="重新加载章节信息"
                  >
                    🔄
                  </button>
                </div>
                {error.includes("temporarily unavailable") && (
                  <div className="text-xs text-base-content/60 mt-1">
                    新章节可能需要几分钟时间同步，请稍后再试
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-base-content/60 mb-2">正在加载章节标题...</div>
            )}
          </div>
          <div className="badge badge-primary badge-lg">#{chapter.id}</div>
        </div>

        {/* 作者和时间 */}
        <div className="flex items-center gap-6 text-sm text-base-content/70 mb-4 p-3 bg-base-200/50 rounded-lg">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <span className="font-medium">作者:</span>
            <Address address={chapter.author} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(chapter.createdTime * 1000).toLocaleDateString()}</span>
          </div>
          {/* 显示fork费用 */}
          {chapter.forkFee && chapter.forkFee !== "0" && (
            <div className="flex items-center gap-2 text-orange-600 font-medium">
              <ShareIcon className="w-4 h-4" />
              <span>分叉费用: {formatEther(BigInt(chapter.forkFee))} ETH</span>
            </div>
          )}
        </div>

        {/* 章节摘要 */}
        {metadata?.title && (
          <div className="mb-4 p-3 bg-base-100 border border-base-300 rounded-lg">
            <h5 className="font-medium text-base-content mb-1">{metadata.title}</h5>
            {metadata?.description && (
              <p className="text-base-content/70 text-sm leading-relaxed line-clamp-2">{metadata.description}</p>
            )}
          </div>
        )}

        {/* 统计信息和交互 */}
        <div className="flex flex-wrap items-center gap-4 text-sm mb-6 p-3 bg-base-200/30 rounded-lg">
          <LikeButton tokenId={BigInt(chapter.id)} isStory={false} currentLikes={chapter.likes} showCount={true} />

          <div className="flex items-center gap-2 text-base-content/70">
            <ShareIcon className="w-4 h-4" />
            <span className="font-medium">{chapter.forkCount}</span>
            <span>个分叉</span>
          </div>

          <div className="flex items-center gap-2 text-base-content/70">
            <CurrencyDollarIcon className="w-4 h-4" />
            <span className="font-medium">{formatEther(BigInt(chapter.totalTips))} ETH</span>
            <span>打赏</span>
          </div>

          {/* 分叉信息 */}
          {forks.length > 1 && (
            <div className="flex items-center gap-2 text-warning">
              <ShareIcon className="w-4 h-4" />
              <span className="font-medium">{forks.length}</span>
              <span>个分支</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex gap-3">
            <a href={`/story/${chapter.storyId}/chapter/${chapter.id}`} className="btn btn-primary gap-2">
              <BookOpenIcon className="w-4 h-4" />
              阅读章节
            </a>

            {forks.length > 1 && onSelectFork && (
              <div className="dropdown">
                <button className="btn btn-secondary gap-2" role="button" tabIndex={0}>
                  <ShareIcon className="w-4 h-4" />
                  选择分支 ({forks.length})
                </button>
                <ul className="dropdown-content menu bg-base-100 rounded-box z-[1] w-80 p-2 shadow-xl border border-base-300 mt-1">
                  {forks.map((fork, index) => (
                    <li key={fork.id}>
                      <a
                        href={`/story/${fork.storyId}/chapter/${fork.id}`}
                        className="flex justify-between items-center p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary text-primary-content rounded-full flex items-center justify-center text-xs font-bold">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="font-medium">分支 {String.fromCharCode(65 + index)}</span>
                        </div>
                        <div className="text-xs text-base-content/60">
                          <Address address={fork.author} size="sm" />
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onTip(chapter.storyId, chapter.id)}
              className="btn btn-outline btn-sm gap-2"
              disabled={!address}
              title={!address ? "请先连接钱包" : "给章节作者打赏"}
            >
              <CurrencyDollarIcon className="w-4 h-4" />
              打赏
            </button>
            <button
              onClick={() => onContinue(chapter.id)}
              className="btn btn-secondary btn-sm gap-2"
              disabled={!address || !canUserContinueChapter(chapter, allChapters)}
              title={getContinueButtonTooltip(chapter, allChapters)}
            >
              <PlusIcon className="w-4 h-4" />
              续写
            </button>
            <button
              onClick={() => onFork(chapter.id)}
              className="btn btn-primary btn-sm gap-2"
              disabled={!address}
              title={
                !address
                  ? "请先连接钱包"
                  : `基于此章节创建分叉${chapter.forkFee && chapter.forkFee !== "0" ? ` (需支付 ${formatEther(BigInt(chapter.forkFee))} ETH)` : ""}`
              }
            >
              <ShareIcon className="w-4 h-4" />
              分叉
              {chapter.forkFee && chapter.forkFee !== "0" && (
                <span className="badge badge-warning badge-xs ml-1">{formatEther(BigInt(chapter.forkFee))} ETH</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 如果有分叉，显示分叉选择器 */}
      {forks.length > 1 && onSelectFork && (
        <ForkSelector parentChapter={chapter} forks={forks} onSelectFork={onSelectFork} />
      )}
    </div>
  );
};

// 树形节点组件
const ChapterTreeNode: React.FC<{
  chapter: ChapterWithMetadata;
  childChapters: ChapterWithMetadata[];
  level: number;
  onFork: (chapterId: string) => void;
  onTip: (storyId: string, chapterId: string) => void;
  onContinue: (chapterId: string) => void;
  storyId: string;
  isLast: boolean;
  allChapters: ChapterWithMetadata[];
  canUserContinueChapter: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => boolean;
  getContinueButtonTooltip: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => string;
}> = ({ chapter, childChapters, level, onFork, onTip, onContinue, storyId, isLast, allChapters, canUserContinueChapter, getContinueButtonTooltip }) => {
  const { address } = useAccount();
  const [metadata, setMetadata] = useState<ChapterMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // 加载章节元数据
  useEffect(() => {
    const loadMetadata = async () => {
      if (!chapter.ipfsHash) return;

      setMetadataLoading(true);
      setMetadataError(null);
      try {
        const data = await getJSONFromIPFS(chapter.ipfsHash, 4); // Increase retry attempts
        setMetadata(data);
      } catch (err) {
        console.error(`❌ Failed to load tree node metadata for chapter ${chapter.id}:`, err);
        const errorMsg = err instanceof Error ? err.message : "加载元数据失败";
        setMetadataError(errorMsg);

        // Auto-retry for recent chapters
        const isRecentChapter = Date.now() - (chapter.createdTime * 1000) < 300000; // 5 minutes
        if (isRecentChapter && !retrying) {
          console.log(`⏳ Auto-retrying tree node metadata for recent chapter ${chapter.id} in 3 seconds...`);
          setRetrying(true);
          setTimeout(() => {
            setRetrying(false);
            loadMetadata();
          }, 3000);
        }
      } finally {
        setMetadataLoading(false);
      }
    };

    loadMetadata();
  }, [chapter.ipfsHash, chapter.id, chapter.createdTime, retrying]);

  return (
    <div className="relative">
      {/* 树形连接线 */}
      {level > 0 && (
        <>
          <div className="absolute left-4 top-0 w-px h-6 bg-base-300"></div>
          <div className="absolute left-4 top-6 w-4 h-px bg-base-300"></div>
          {!isLast && <div className="absolute left-4 top-6 w-px h-full bg-base-300"></div>}
        </>
      )}

      <div className={`flex items-start gap-4 ${level > 0 ? "ml-8" : ""}`}>
        {/* 章节节点 */}
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-bold">
          {chapter.chapterNumber}
        </div>

        {/* 章节信息卡片 */}
        <div className="flex-1 card bg-base-50 border border-base-300 hover:border-primary/50 transition-colors">
          <div className="card-body p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-base-content flex items-center gap-2">
                  第 {chapter.chapterNumber} 章
                  {(metadataLoading || retrying) && <span className="loading loading-spinner loading-xs"></span>}
                  {metadataError && (
                    <button
                      onClick={() => {
                        setRetrying(true);
                        setMetadataLoading(true);
                      }}
                      className="btn btn-xs btn-ghost"
                      title="重新加载章节信息"
                    >
                      🔄
                    </button>
                  )}
                </h4>

                {metadata?.title ? (
                  <p className="text-sm text-base-content/70 mt-1">{metadata.title}</p>
                ) : metadataError ? (
                  <p className="text-xs text-warning mt-1">📖 章节信息加载中...</p>
                ) : metadataLoading ? (
                  <p className="text-xs text-base-content/50 mt-1">正在加载章节标题...</p>
                ) : null}

                <div className="flex items-center gap-4 text-xs text-base-content/60 mt-2">
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <Address address={chapter.author} size="sm" />
                  </div>
                  <span>{new Date(chapter.createdTime * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-3 text-xs text-base-content/60">
                <div className="flex items-center gap-1">
                  <span>❤️</span>
                  <span>{chapter.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>💰</span>
                  <span>{formatEther(BigInt(chapter.totalTips))} ETH</span>
                </div>
                {chapter.forkFee && chapter.forkFee !== "0" && (
                  <div className="flex items-center gap-1">
                    <span>🔀</span>
                    <span>{formatEther(BigInt(chapter.forkFee))} ETH</span>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <a href={`/story/${storyId}/chapter/${chapter.id}`} className="btn btn-xs btn-primary gap-1">
                  <BookOpenIcon className="w-3 h-3" />
                  阅读
                </a>

                <button
                  onClick={() => onTip(storyId, chapter.id)}
                  className="btn btn-xs btn-secondary gap-1"
                  disabled={!address}
                  title={!address ? "请先连接钱包" : "给章节作者打赏"}
                >
                  <CurrencyDollarIcon className="w-3 h-3" />
                  打赏
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onContinue(chapter.id)}
                  className="btn btn-xs btn-outline gap-1"
                  disabled={!address || !canUserContinueChapter(chapter, allChapters)}
                  title={getContinueButtonTooltip(chapter, allChapters)}
                >
                  <PlusIcon className="w-3 h-3" />
                  续写
                </button>

                <button
                  onClick={() => onFork(chapter.id)}
                  className="btn btn-xs btn-accent gap-1"
                  disabled={!address}
                  title={
                    !address
                      ? "请先连接钱包"
                      : `基于此章节创建分叉${chapter.forkFee && chapter.forkFee !== "0" ? ` (需支付 ${formatEther(BigInt(chapter.forkFee))} ETH)` : ""}`
                  }
                >
                  <ShareIcon className="w-3 h-3" />
                  分叉
                  {chapter.forkFee && chapter.forkFee !== "0" && (
                    <span className="badge badge-warning badge-xs">{formatEther(BigInt(chapter.forkFee))} ETH</span>
                  )}
                </button>
              </div>
            </div>

            {/* 分叉提示 */}
            {childChapters.length > 1 && (
              <div className="mt-2 text-xs text-warning flex items-center gap-1">
                <ShareIcon className="w-3 h-3" />
                <span>此章节有 {childChapters.length} 个分叉</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 渲染子章节 */}
      {childChapters.length > 0 && (
        <div className="mt-4 space-y-4">
          {childChapters.map((child, index) => {
            const grandChildren = allChapters.filter(c => c.parentId === child.id);
            return (
              <ChapterTreeNode
                key={child.id}
                chapter={child}
                childChapters={grandChildren}
                level={level + 1}
                onFork={onFork}
                onTip={onTip}
                onContinue={onContinue}
                storyId={storyId}
                isLast={index === childChapters.length - 1}
                allChapters={allChapters}
                canUserContinueChapter={canUserContinueChapter}
                getContinueButtonTooltip={getContinueButtonTooltip}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// 章节树形视图组件
const ChapterTreeView: React.FC<{
  chapters: ChapterWithMetadata[];
  onFork: (chapterId: string) => void;
  onTip: (storyId: string, chapterId: string) => void;
  onContinue: (chapterId: string) => void;
  storyId: string;
  canUserContinueChapter: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => boolean;
  getContinueButtonTooltip: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => string;
}> = ({ chapters, onFork, onTip, onContinue, storyId, canUserContinueChapter, getContinueButtonTooltip }) => {
  // 构建树形结构
  const buildTree = () => {
    const rootChapters = chapters.filter(chapter => chapter.parentId === "0");
    return rootChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  };

  const getChildren = (parentId: string) => {
    return chapters.filter(chapter => chapter.parentId === parentId).sort((a, b) => a.chapterNumber - b.chapterNumber);
  };

  const rootChapters = buildTree();

  if (rootChapters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 树形统计信息 */}
      <div className="flex items-center justify-between text-sm text-base-content/70 pb-4 border-b border-base-300">
        <div className="flex items-center gap-4">
          <span>总章节: {chapters.length}</span>
          <span>分叉点: {chapters.filter(c => getChildren(c.id).length > 1).length}</span>
        </div>
        <div className="text-xs text-base-content/50">点击节点可查看详细信息，使用操作按钮进行互动</div>
      </div>

      {/* 树形结构 */}
      <div className="space-y-6">
        {rootChapters.map((rootChapter, index) => {
          const children = getChildren(rootChapter.id);
          return (
            <ChapterTreeNode
              key={rootChapter.id}
              chapter={rootChapter}
              childChapters={children}
              level={0}
              onFork={onFork}
              onTip={onTip}
              onContinue={onContinue}
              storyId={storyId}
              isLast={index === rootChapters.length - 1}
              allChapters={chapters}
              canUserContinueChapter={canUserContinueChapter}
              getContinueButtonTooltip={getContinueButtonTooltip}
            />
          );
        })}
      </div>
    </div>
  );
};

const AddChapterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  parentId: string;
  onChapterAdded: () => void;
}> = ({ isOpen, onClose, storyId, parentId, onChapterAdded }) => {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    forkFee: "0",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCid, setImageCid] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { writeContractAsync: createChapter } = useScaffoldWriteContract("StoryChain");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      notification.error("请先连接钱包");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      notification.error("标题和内容不能为空");
      return;
    }

    try {
      setIsCreating(true);

      // 创建章节元数据
      const metadata: ChapterMetadata = {
        title: formData.title,
        content: formData.content,
        author: address,
        timestamp: Date.now(),
        storyId: storyId.toString(),
        parentChapterId: parentId.toString(),
        chapterNumber: 1, // 这里应该根据实际情况计算
        image: imageCid,
      };

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约创建章节
      await createChapter({
        functionName: "createChapter",
        args: [BigInt(storyId), BigInt(parentId), ipfsHash, parseEther(formData.forkFee)],
      });

      notification.success("章节创建成功！");
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");

      // 延迟重新加载数据以确保区块链状态更新
      setTimeout(() => {
        onChapterAdded();
      }, 3000); // Increase delay to 3 seconds for better IPFS sync
      
      onClose();
    } catch (error) {
      console.error("创建章节失败:", error);
      notification.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-base-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">添加新章节</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节标题 *</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="输入章节标题..."
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节内容 *</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full h-48"
                placeholder="继续你的故事..."
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">分叉费用</span>
                <span className="label-text-alt">ETH</span>
              </label>
              <input
                type="number"
                value={formData.forkFee}
                onChange={e => setFormData(prev => ({ ...prev, forkFee: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="0.01"
                min="0"
                step="0.01"
                disabled={isCreating}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节插图</span>
              </label>
              <ImageUploader
                onImageUpload={(cid, url) => {
                  setImageCid(cid);
                  setImageUrl(url);
                }}
                className="w-full"
                previewImage={imageUrl}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={isCreating}>
                取消
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    创建中...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    创建章节
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ContinueChapterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  parentChapter: ChapterWithMetadata;
  onChapterAdded: () => void;
}> = ({ isOpen, onClose, storyId, parentChapter, onChapterAdded }) => {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    forkFee: "0",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCid, setImageCid] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [forkFeeRequired, setForkFeeRequired] = useState<string>("0");

  const { writeContractAsync: createChapter } = useScaffoldWriteContract("StoryChain");

  // 初始化时获取父章节的fork费用
  useEffect(() => {
    if (parentChapter && parentChapter.forkFee !== undefined) {
      const forkFeeStr = parentChapter.forkFee.toString();
      if (forkFeeStr !== "0") {
        setForkFeeRequired(formatEther(BigInt(forkFeeStr)));
      } else {
        setForkFeeRequired("0");
      }
    }
  }, [parentChapter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      notification.error("请先连接钱包");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      notification.error("标题和内容不能为空");
      return;
    }

    try {
      setIsCreating(true);

      // 创建章节元数据
      const metadata: ChapterMetadata = {
        title: formData.title,
        content: formData.content,
        author: address,
        timestamp: Date.now(),
        storyId: storyId.toString(),
        parentChapterId: parentChapter.id.toString(),
        chapterNumber: parentChapter.chapterNumber + 1,
        image: imageCid,
      };

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约创建章节，作者续写自己的章节不需要支付费用
      await createChapter({
        functionName: "createChapter",
        args: [BigInt(storyId), BigInt(parentChapter.id), ipfsHash, parseEther(formData.forkFee)],
      });

      notification.success("章节续写成功！");
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");

      // 延迟重新加载数据以确保区块链状态更新
      setTimeout(() => {
        onChapterAdded();
      }, 3000); // Increase delay to 3 seconds
      
      onClose();
    } catch (error) {
      console.error("续写章节失败:", error);
      notification.error(error instanceof Error ? error.message : "续写失败");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-base-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">续写章节 - 第 {parentChapter.chapterNumber + 1} 章</h2>

          {/* 显示父章节信息 */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm text-base-content/70 mb-2">基于章节：</h3>
            <p className="font-medium">第 {parentChapter.chapterNumber} 章</p>
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <UserIcon className="w-3 h-3" />
              <Address address={parentChapter.author} size="sm" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节标题 *</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="输入章节标题..."
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节内容 *</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full h-48"
                placeholder="继续这个故事..."
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">设置续写费用</span>
                <span className="label-text-alt">ETH (其他用户续写此章节时需支付)</span>
              </label>
              <input
                type="number"
                value={formData.forkFee}
                onChange={e => setFormData(prev => ({ ...prev, forkFee: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="0.01"
                min="0"
                step="0.01"
                disabled={isCreating}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节插图</span>
              </label>
              <ImageUploader
                onImageUpload={(cid, url) => {
                  setImageCid(cid);
                  setImageUrl(url);
                }}
                className="w-full"
                previewImage={imageUrl}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={isCreating}>
                取消
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    续写中...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    续写章节
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ForkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  parentChapter: ChapterWithMetadata;
  onForkSuccess: () => void;
}> = ({ isOpen, onClose, storyId, parentChapter, onForkSuccess }) => {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    forkFee: "0",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCid, setImageCid] = useState("");
  const [isForking, setIsForking] = useState(false);
  const [forkFeeRequired, setForkFeeRequired] = useState<string>("0");

  const { writeContractAsync: forkStory } = useScaffoldWriteContract("StoryChain");

  // 初始化时获取父章节的fork费用
  useEffect(() => {
    if (parentChapter && parentChapter.forkFee !== undefined) {
      const forkFeeStr = parentChapter.forkFee.toString();
      if (forkFeeStr !== "0") {
        setForkFeeRequired(formatEther(BigInt(forkFeeStr)));
      } else {
        setForkFeeRequired("0");
      }
    }
  }, [parentChapter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      notification.error("请先连接钱包");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      notification.error("标题和内容不能为空");
      return;
    }

    // 检查fork费用
    const requiredFee = parseFloat(forkFeeRequired);
    if (requiredFee > 0) {
      const confirm = window.confirm(`分叉此章节需要支付 ${forkFeeRequired} ETH 给原作者。确定要继续吗？`);
      if (!confirm) {
        return;
      }
    }

    try {
      setIsForking(true);

      // 创建分叉章节元数据（注意：这是章节，不是新故事）
      const metadata: ChapterMetadata = {
        title: formData.title,
        content: formData.content,
        author: address,
        timestamp: Date.now(),
        storyId: storyId, // 保持在同一个故事中
        parentChapterId: parentChapter.id.toString(),
        chapterNumber: parentChapter.chapterNumber + 1, // 下一章编号
        image: imageCid,
      };

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约创建分叉章节，需要支付fork费用
      const valueToSend = requiredFee > 0 ? parseEther(forkFeeRequired) : undefined;

      await forkStory({
        functionName: "forkStory",
        args: [BigInt(storyId), BigInt(parentChapter.id), ipfsHash, parseEther(formData.forkFee)],
        value: valueToSend,
      });

      notification.success("章节分叉成功！");
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");

      // 延迟重新加载数据以确保区块链状态更新
      setTimeout(() => {
        onForkSuccess();
      }, 3000); // Increase delay to 3 seconds
      
      onClose();
    } catch (error) {
      console.error("分叉失败:", error);
      notification.error(error instanceof Error ? error.message : "分叉失败");
    } finally {
      setIsForking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-base-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">创建章节分叉</h2>

          {/* 显示原章节信息 */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm text-base-content/70 mb-2">基于章节：</h3>
            <p className="font-medium">第 {parentChapter.chapterNumber} 章</p>
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <UserIcon className="w-3 h-3" />
              <Address address={parentChapter.author} size="sm" />
            </div>
            <div className="text-xs text-base-content/50 mt-2">将创建一个新的章节分支，仍属于当前故事</div>
          </div>

          {/* 如果需要支付fork费用，显示提醒 */}
          {forkFeeRequired !== "0" && (
            <div className="alert alert-warning mb-4">
              <InformationCircleIcon className="w-5 h-5" />
              <div>
                <div className="font-semibold">需要支付分叉费用</div>
                <div className="text-sm">分叉此章节需要支付 {forkFeeRequired} ETH</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">分叉章节标题 *</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="输入分叉章节的标题..."
                disabled={isForking}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">分叉内容 *</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full h-48"
                placeholder="从这里开始你的分叉章节..."
                disabled={isForking}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">设置续写费用</span>
                <span className="label-text-alt">ETH (其他用户续写此分叉章节时需支付)</span>
              </label>
              <input
                type="number"
                value={formData.forkFee}
                onChange={e => setFormData(prev => ({ ...prev, forkFee: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="0.01"
                min="0"
                step="0.01"
                disabled={isForking}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">章节插图</span>
              </label>
              <ImageUploader
                onImageUpload={(cid, url) => {
                  setImageCid(cid);
                  setImageUrl(url);
                }}
                className="w-full"
                previewImage={imageUrl}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={isForking}>
                取消
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={isForking}>
                {isForking ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    分叉中...
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-4 h-4" />
                    {forkFeeRequired !== "0" ? `支付 ${forkFeeRequired} ETH 并创建分叉` : "创建章节分叉"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const StoryDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const { t } = useLanguage();

  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showContinueChapter, setShowContinueChapter] = useState(false);
  const [showForkModal, setShowForkModal] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterWithMetadata | null>(null);
  const [forkingChapter, setForkingChapter] = useState<ChapterWithMetadata | null>(null);
  const [story, setStory] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyMetadata, setStoryMetadata] = useState<StoryMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const storyId = id as string;

  // 检查用户是否可以续写指定章节
  const canUserContinueChapter = useCallback((chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => {
    if (!address) return false;
    
    // 只有章节作者才能续写自己的章节
    if (chapter.author.toLowerCase() !== address.toLowerCase()) return false;
    
    // 只有最新章节才能续写（即没有子章节的章节）
    const hasChildren = allChapters.some(c => c.parentId === chapter.id);
    return !hasChildren;
  }, [address]);

  // 获取续写按钮的提示文本
  const getContinueButtonTooltip = useCallback((chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => {
    if (!address) return "请先连接钱包";
    if (chapter.author.toLowerCase() !== address.toLowerCase()) return "只有章节作者可以续写自己的章节";
    
    const hasChildren = allChapters.some(c => c.parentId === chapter.id);
    if (hasChildren) return "只有最新章节才能续写";
    
    return "续写此章节";
  }, [address]);

  // 直接使用fetch获取数据，避开hook问题
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!storyId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // 添加时间戳参数避免缓存问题
      const timestamp = Date.now();

      // 获取故事数据
      const storyRes = await fetch(`/api/data/stories/${storyId}?t=${timestamp}`);
      if (storyRes.ok) {
        const storyData = await storyRes.json();
        const storyInfo = storyData.story;
        setStory(storyInfo);

        // 异步加载故事元数据
        if (storyInfo?.ipfsHash) {
          loadStoryMetadata(storyInfo.ipfsHash);
        }
      } else {
        throw new Error(`故事数据获取失败: ${storyRes.status}`);
      }

      // 获取章节数据
      const chaptersRes = await fetch(`/api/data/chapters?storyId=${storyId}&t=${timestamp}`);
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData.chapters || []);
      }
    } catch (err) {
      console.error("获取数据失败:", err);
      setError(err instanceof Error ? err.message : "获取数据失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storyId]);

  // 加载故事元数据
  const loadStoryMetadata = useCallback(async (ipfsHash: string) => {
    if (!ipfsHash) return;

    setMetadataLoading(true);
    try {
      const data = await getJSONFromIPFS(ipfsHash);
      const validatedMetadata: StoryMetadata = {
        title: data?.title || undefined,
        description: data?.description || undefined,
        tags: Array.isArray(data?.tags) ? data.tags : undefined,
        content: data?.content || undefined,
        image: data?.image || undefined,
      };
      setStoryMetadata(validatedMetadata);
    } catch (err) {
      console.error("加载故事元数据失败:", err);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [storyId]);

  // 为每个章节添加 metadata 字段以支持类型检查
  const chaptersWithMetadata: ChapterWithMetadata[] = (chapters || []).map(chapter => ({
    ...chapter,
    metadata: undefined, // 将由 ChapterCard 组件异步加载
  }));

  // 合约调用函数
  const { writeContractAsync: tip } = useScaffoldWriteContract("StoryChain");

  const handleLikeSuccess = () => {
    // 点赞成功后延迟重新获取数据
    setTimeout(() => {
      fetchData(true);
    }, 2000); // Increase delay for better data consistency
  };

  const handleTip = async (storyId: string, chapterId: string) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      return;
    }

    const tipAmount = prompt("请输入打赏金额 (ETH):", "0.01");
    if (!tipAmount || parseFloat(tipAmount) <= 0) return;

    try {
      await tip({
        functionName: "tip",
        args: [BigInt(storyId), BigInt(chapterId)],
        value: parseEther(tipAmount),
      });
      notification.success(t("success.tipped"));

      // 延迟重新加载数据以确保区块链状态更新
      setTimeout(() => {
        fetchData(true);
      }, 3000); // Increase delay to 3 seconds
    } catch (error) {
      console.error("打赏失败:", error);
      notification.error("打赏失败");
    }
  };

  const handleContinueChapter = (chapterId: string) => {
    if (!address) {
      notification.error("请先连接钱包");
      return;
    }

    // 找到要续写的章节
    const chapter = chaptersWithMetadata.find(ch => ch.id === chapterId);
    if (!chapter) {
      notification.error("章节不存在");
      return;
    }

    // 检查续写权限：只有章节作者可以续写自己的章节
    if (chapter.author.toLowerCase() !== address.toLowerCase()) {
      notification.error("只有章节作者可以续写自己的章节");
      return;
    }

    setSelectedChapter(chapter);
    setShowContinueChapter(true);
  };

  const handleFork = (chapterId: string) => {
    if (!address) {
      notification.error("请先连接钱包");
      return;
    }

    // 找到要分叉的章节
    const chapter = chaptersWithMetadata.find(ch => ch.id === chapterId);
    if (!chapter) {
      notification.error("章节不存在");
      return;
    }

    setForkingChapter(chapter);
    setShowForkModal(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-base-300 rounded w-1/2"></div>
          <div className="h-32 bg-base-300 rounded"></div>
          <div className="space-y-4">
            <div className="h-6 bg-base-300 rounded"></div>
            <div className="h-6 bg-base-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <div className="alert alert-error">
          <InformationCircleIcon className="w-6 h-6" />
          <span>加载失败: {error}</span>
          <button className="btn btn-sm" onClick={fetchData}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <div className="alert alert-error">
          <InformationCircleIcon className="w-6 h-6" />
          <span>故事不存在或加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 刷新指示器 */}
      {refreshing && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-content px-4 py-2 rounded-lg shadow-lg">
          <span className="loading loading-spinner loading-sm"></span>
          <span>正在更新数据...</span>
        </div>
      )}

      {/* 返回按钮 */}
      <button onClick={() => router.back()} className="btn btn-ghost gap-2 mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        返回
      </button>

      {/* 故事信息 */}
      <div className="card bg-base-100 shadow-xl mb-8 overflow-hidden">
        {/* 故事封面 */}
        {(storyMetadata?.image || metadataLoading) && (
          <div className="relative">
            {metadataLoading ? (
              <div className="h-64 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <div className="loading loading-spinner loading-lg text-white"></div>
              </div>
            ) : (
              <StoryCover
                image={storyMetadata?.image}
                title={storyMetadata?.title || `故事 #${storyId}`}
                storyId={storyId}
                className="h-64 w-full"
              />
            )}
          </div>
        )}

        <div className="card-body">
          {/* 标题和基本信息 */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-2">{storyMetadata?.title || `故事 #${storyId}`}</h1>
            {storyMetadata?.description && <p className="text-base-content/70 mb-4">{storyMetadata.description}</p>}

            {/* 标签 */}
            {storyMetadata?.tags && storyMetadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {storyMetadata.tags.map((tag: string, index: number) => (
                  <span key={index} className="badge badge-outline badge-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 作者和时间信息 */}
            <div className="flex items-center gap-4 text-sm text-base-content/70 mb-4">
              <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <Address address={story.author} size="sm" />
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                <span>{new Date(story.createdTime * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <LikeButton
                tokenId={BigInt(storyId)}
                isStory={true}
                currentLikes={story.likes}
                showCount={true}
                onLikeSuccess={handleLikeSuccess}
              />

              <div className="flex items-center gap-1 text-sm text-base-content/70">
                <ShareIcon className="w-4 h-4" />
                <span>{story.forkCount} 分叉</span>
              </div>

              <div className="flex items-center gap-1 text-sm text-base-content/70">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span>{formatEther(BigInt(story.totalTips))} ETH 打赏</span>
              </div>
            </div>

            {story.author === address && (
              <button
                onClick={() => setShowAddChapter(true)}
                className="btn btn-primary gap-2"
                title="添加新章节（仅故事作者可操作）"
              >
                <PlusIcon className="w-4 h-4" />
                添加章节
              </button>
            )}

            {/* 续写故事按钮 - 只有最新章节的作者可以续写 */}
            {address && chaptersWithMetadata.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // 续写最后一章
                    const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                    handleContinueChapter(lastChapter.id);
                  }}
                  className="btn btn-secondary gap-2"
                  disabled={!canUserContinueChapter(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)}
                  title={getContinueButtonTooltip(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)}
                >
                  <PlusIcon className="w-4 h-4" />
                  续写故事
                </button>

                <button
                  onClick={() => {
                    const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                    handleFork(lastChapter.id);
                  }}
                  className="btn btn-outline gap-2"
                  title="基于这个故事创建分叉"
                >
                  <ShareIcon className="w-4 h-4" />
                  分叉故事
                </button>
              </div>
            )}

            {/* 添加第一章的按钮 - 当没有章节时显示 */}
            {address && chaptersWithMetadata.length === 0 && (
              <button
                onClick={() => setShowAddChapter(true)}
                className="btn btn-secondary gap-2"
                title="为这个故事添加第一章"
              >
                <PlusIcon className="w-4 h-4" />
                {story.author === address ? "添加第一章" : "续写第一章"}
              </button>
            )}

            {!address && <div className="text-sm text-base-content/60">连接钱包后可续写章节或创建分叉</div>}
          </div>
        </div>
      </div>

      {/* 章节树形结构 */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-primary" />
            故事结构
          </h2>
          {/* 快速操作按钮 */}
          {address && chaptersWithMetadata.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                  handleContinueChapter(lastChapter.id);
                }}
                className="btn btn-secondary gap-2"
                disabled={!canUserContinueChapter(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)}
                title={getContinueButtonTooltip(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)}
              >
                <PlusIcon className="w-5 h-5" />
                续写最新章节
              </button>
              <button
                onClick={() => {
                  const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                  handleFork(lastChapter.id);
                }}
                className="btn btn-outline gap-2"
                title="分叉最新章节"
              >
                <ShareIcon className="w-5 h-5" />
                分叉最新章节
              </button>
            </div>
          )}
        </div>

        {chaptersWithMetadata.length > 0 ? (
          <div className="bg-base-100 rounded-lg border border-base-300 p-6">
            <ChapterTreeView
              chapters={chaptersWithMetadata}
              onFork={handleFork}
              onTip={handleTip}
              onContinue={handleContinueChapter}
              storyId={storyId}
              canUserContinueChapter={canUserContinueChapter}
              getContinueButtonTooltip={getContinueButtonTooltip}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpenIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/70 mb-2">还没有章节</p>
            <p className="text-sm text-base-content/50 mb-4">任何人都可以为这个故事添加第一章，开始精彩的故事之旅</p>
            {address ? (
              <button onClick={() => setShowAddChapter(true)} className="btn btn-primary mt-2 gap-2">
                <PlusIcon className="w-4 h-4" />
                {story.author === address ? "添加第一章" : "续写第一章"}
              </button>
            ) : (
              <div className="text-sm text-base-content/60">连接钱包后即可添加第一章</div>
            )}
          </div>
        )}
      </div>

      {/* 评论区 */}
      <CommentSection
        tokenId={BigInt(storyId)}
        tokenType="story"
        className="card bg-base-100 shadow-lg mt-8 card-body"
      />

      {/* 添加章节模态框 */}
      <AddChapterModal
        isOpen={showAddChapter}
        onClose={() => setShowAddChapter(false)}
        storyId={storyId}
        parentId="0"
        onChapterAdded={() => {
          // 重新加载章节列表
          fetchData(true);
          console.log("Chapter added, reloaded data");
        }}
      />

      {/* 续写章节模态框 */}
      {selectedChapter && (
        <ContinueChapterModal
          isOpen={showContinueChapter}
          onClose={() => {
            setShowContinueChapter(false);
            setSelectedChapter(null);
          }}
          storyId={storyId}
          parentChapter={selectedChapter}
          onChapterAdded={() => {
            // 重新加载章节列表
            fetchData(true);
            console.log("Chapter continued, reloaded data");
          }}
        />
      )}

      {/* 分叉故事模态框 */}
      {forkingChapter && (
        <ForkModal
          isOpen={showForkModal}
          onClose={() => {
            setShowForkModal(false);
            setForkingChapter(null);
          }}
          storyId={storyId}
          parentChapter={forkingChapter}
          onForkSuccess={() => {
            // 重新加载数据
            fetchData(true);
            console.log("Story forked, reloaded data");
          }}
        />
      )}

      {/* 浮动续写按钮 - 固定在右下角 */}
      {address && chaptersWithMetadata.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                handleContinueChapter(lastChapter.id);
              }}
              className="btn btn-secondary btn-circle shadow-lg hover:shadow-xl transition-all"
              disabled={!canUserContinueChapter(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)}
              title={getContinueButtonTooltip(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                handleFork(lastChapter.id);
              }}
              className="btn btn-outline btn-circle shadow-lg hover:shadow-xl transition-all"
              title="分叉最新章节"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryDetailPage;
