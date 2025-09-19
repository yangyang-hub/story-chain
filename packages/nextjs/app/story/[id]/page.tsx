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
import { ChapterData } from "~~/lib/types";
import chainDataService from "~~/services/chain/chainDataService";
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
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({ image, title, storyId, className = "", t }) => {
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
        alt={title || t("explore.story_alt", { id: storyId })}
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
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({ parentChapter, forks, onSelectFork, t }) => {
  if (forks.length <= 1) return null;

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-warning/10 to-info/10 border border-warning/30 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <ShareIcon className="w-6 h-6 text-warning" />
        <h4 className="text-lg font-bold text-warning">{t("chapter.story_fork_here")}</h4>
        <div className="badge badge-warning">{t("chapter.branches_count", { count: forks.length.toString() })}</div>
      </div>
      <p className="text-base-content/80 mb-6 text-sm leading-relaxed">
        {t("chapter.fork_description", {
          number: parentChapter.chapterNumber.toString(),
          count: forks.length.toString(),
        })}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {forks.map((fork, index) => (
          <button
            key={fork.id}
            onClick={() => onSelectFork(fork.id.toString())}
            className="text-left p-4 border-2 border-base-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center font-bold text-sm">
                  {String.fromCharCode(65 + index)}
                </div>
                <h5 className="font-bold text-primary group-hover:text-primary-focus">
                  {t("chapter.title", { number: fork.chapterNumber.toString() })}
                </h5>
              </div>
              <div className="text-xs text-base-content/60 flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <Address address={fork.author} size="sm" />
              </div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-base-content/50">{t("chapter.reading_detail")}</div>
            </div>
            <div className="flex justify-between items-center text-xs text-base-content/60">
              <span>{new Date(Number(fork.createdTime) * 1000).toLocaleDateString()}</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span>👍</span>
                  <span className="font-medium">{fork.likes}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CurrencyDollarIcon className="w-3 h-3" />
                  <span className="font-medium">{formatEther(BigInt(fork.totalTips))} STT</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChapterCard: React.FC<{
  chapter: ChapterWithMetadata;
  onFork: (chapterId: string) => void;
  onTip: (chapterId: string) => void;
  onContinue: (chapterId: string) => void;
  forks?: ChapterWithMetadata[];
  onSelectFork?: (forkId: string) => void;
  allChapters: ChapterWithMetadata[];
  canUserContinueChapter: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => boolean;
  getContinueButtonTooltip: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({
  chapter,
  onFork,
  onTip,
  onContinue,
  forks = [],
  onSelectFork,
  allChapters,
  canUserContinueChapter,
  getContinueButtonTooltip,
  t,
}) => {
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
        setError(error instanceof Error ? error.message : t("error.metadata_load_failed"));

        // Auto-retry for new chapters (likely IPFS sync issue)
        const isRecentChapter = Date.now() - Number(chapter.createdTime) * 1000 < 300000; // 5 minutes
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
              <div className="text-sm text-base-content/70 mt-2">{t("chapter.reloading")}</div>
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
            <h3 className="card-title text-xl font-bold text-primary mb-2">
              {t("chapter.title", { number: chapter.chapterNumber.toString() })}
            </h3>
            {metadata?.title ? (
              <h4 className="text-lg font-semibold text-base-content/90 mb-2">{metadata.title}</h4>
            ) : error ? (
              <div className="text-sm text-warning mb-2">
                <div className="flex items-center gap-2">
                  <span>{t("chapter.loading_title")}</span>
                  <button
                    onClick={() => {
                      setRetrying(true);
                      setLoading(true);
                    }}
                    className="btn btn-xs btn-ghost"
                    title={t("chapter.retry_loading")}
                  >
                    🔄
                  </button>
                </div>
                {error.includes("temporarily unavailable") && (
                  <div className="text-xs text-base-content/60 mt-1">{t("chapter.loading_error_new")}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-base-content/60 mb-2">{t("chapter.loading_content")}</div>
            )}
          </div>
          <div className="badge badge-primary badge-lg">#{chapter.id}</div>
        </div>

        {/* 作者和时间 */}
        <div className="flex items-center gap-6 text-sm text-base-content/70 mb-4 p-3 bg-base-200/50 rounded-lg">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            <span className="font-medium">{t("chapter.author_label")}</span>
            <Address address={chapter.author} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(Number(chapter.createdTime) * 1000).toLocaleDateString()}</span>
          </div>
          {/* 显示fork费用 */}
          {chapter.forkFee && chapter.forkFee !== 0n && (
            <div className="flex items-center gap-2 text-orange-600 font-medium">
              <ShareIcon className="w-4 h-4" />
              <span>{t("chapter.fork_fee_label", { fee: formatEther(BigInt(chapter.forkFee)) })}</span>
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
          <LikeButton
            tokenId={BigInt(chapter.id)}
            isStory={false}
            currentLikes={Number(chapter.likes)}
            showCount={true}
          />

          <div className="flex items-center gap-2 text-base-content/70">
            <ShareIcon className="w-4 h-4" />
            <span className="font-medium">{Number(chapter.forkCount)}</span>
            <span>{t("story.forks")}</span>
          </div>

          <div className="flex items-center gap-2 text-base-content/70">
            <CurrencyDollarIcon className="w-4 h-4" />
            <span className="font-medium">{formatEther(BigInt(chapter.totalTips))} STT</span>
            <span>{t("story.tip")}</span>
          </div>

          {/* 分叉信息 */}
          {forks.length > 1 && (
            <div className="flex items-center gap-2 text-warning">
              <ShareIcon className="w-4 h-4" />
              <span className="font-medium">{forks.length}</span>
              <span>{t("chapter.branches_count", { count: forks.length })}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex gap-3">
            <a href={`/story/${chapter.storyId}/chapter/${chapter.id}`} className="btn btn-primary gap-2">
              <BookOpenIcon className="w-4 h-4" />
              {t("chapter.read_chapter")}
            </a>

            {forks.length > 1 && onSelectFork && (
              <div className="dropdown">
                <button className="btn btn-secondary gap-2" role="button" tabIndex={0}>
                  <ShareIcon className="w-4 h-4" />
                  {t("chapter.select_branch", { count: forks.length.toString() })}
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
                          <span className="font-medium">
                            {t("chapter.branch_label", { letter: String.fromCharCode(65 + index) })}
                          </span>
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
              onClick={() => onTip(chapter.id.toString())}
              className="btn btn-outline btn-sm gap-2"
              disabled={!address}
              title={!address ? t("chapter.connect_wallet_tip") : t("chapter.tip_tooltip")}
            >
              <CurrencyDollarIcon className="w-4 h-4" />
              {t("chapter.tip_chapter")}
            </button>
            <button
              onClick={() => onContinue(chapter.id.toString())}
              className="btn btn-secondary btn-sm gap-2"
              disabled={!address || !canUserContinueChapter(chapter, allChapters)}
              title={getContinueButtonTooltip(chapter, allChapters)}
            >
              <PlusIcon className="w-4 h-4" />
              {t("chapter.continue_chapter")}
            </button>
            <button
              onClick={() => onFork(chapter.id.toString())}
              className="btn btn-primary btn-sm gap-2"
              disabled={!address}
              title={
                !address
                  ? t("wallet.connect")
                  : t("chapter.fork_tooltip_fee", { fee: formatEther(BigInt(chapter.forkFee)) })
              }
            >
              <ShareIcon className="w-4 h-4" />
              {t("chapter.fork_chapter")}
              {chapter.forkFee && chapter.forkFee !== 0n && (
                <span className="badge badge-warning badge-xs ml-1">{formatEther(BigInt(chapter.forkFee))} STT</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 如果有分叉，显示分叉选择器 */}
      {forks.length > 1 && onSelectFork && (
        <ForkSelector parentChapter={chapter} forks={forks} onSelectFork={onSelectFork} t={t} />
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
  onTip: (chapterId: string) => void;
  onContinue: (chapterId: string) => void;
  storyId: string;
  isLast: boolean;
  allChapters: ChapterWithMetadata[];
  canUserContinueChapter: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => boolean;
  getContinueButtonTooltip: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({
  chapter,
  childChapters,
  level,
  onFork,
  onTip,
  onContinue,
  storyId,
  isLast,
  allChapters,
  canUserContinueChapter,
  getContinueButtonTooltip,
  t,
}) => {
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
        const errorMsg = err instanceof Error ? err.message : t("error.metadata_load_failed");
        setMetadataError(errorMsg);

        // Auto-retry for recent chapters
        const isRecentChapter = Date.now() - Number(chapter.createdTime) * 1000 < 300000; // 5 minutes
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
                  {t("chapter.title", { number: Number(chapter.chapterNumber) })}
                  {(metadataLoading || retrying) && <span className="loading loading-spinner loading-xs"></span>}
                  {metadataError && (
                    <button
                      onClick={() => {
                        setRetrying(true);
                        setMetadataLoading(true);
                      }}
                      className="btn btn-xs btn-ghost"
                      title={t("chapter.retry_loading")}
                    >
                      🔄
                    </button>
                  )}
                </h4>

                {metadata?.title ? (
                  <p className="text-sm text-base-content/70 mt-1">{metadata.title}</p>
                ) : metadataError ? (
                  <p className="text-xs text-warning mt-1">{t("chapter.info_loading")}</p>
                ) : metadataLoading ? (
                  <p className="text-xs text-base-content/50 mt-1">{t("chapter.loading_content")}</p>
                ) : null}

                <div className="flex items-center gap-4 text-xs text-base-content/60 mt-2">
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <Address address={chapter.author} size="sm" />
                  </div>
                  <span>{new Date(Number(chapter.createdTime) * 1000).toLocaleDateString()}</span>
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
                  <span>{formatEther(BigInt(chapter.totalTips))} STT</span>
                </div>
                {chapter.forkFee && chapter.forkFee !== 0n && (
                  <div className="flex items-center gap-1">
                    <span>🔀</span>
                    <span>{formatEther(BigInt(chapter.forkFee))} STT</span>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <a href={`/story/${storyId}/chapter/${chapter.id}`} className="btn btn-xs btn-primary gap-1">
                  <BookOpenIcon className="w-3 h-3" />
                  {t("button.read")}
                </a>

                <button
                  onClick={() => onTip(chapter.id.toString())}
                  className="btn btn-xs btn-secondary gap-1"
                  disabled={!address}
                  title={!address ? t("chapter.connect_wallet_tip") : t("chapter.tip_tooltip")}
                >
                  <CurrencyDollarIcon className="w-3 h-3" />
                  {t("chapter.tip_chapter")}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onContinue(chapter.id.toString())}
                  className="btn btn-xs btn-outline gap-1"
                  disabled={!address || !canUserContinueChapter(chapter, allChapters)}
                  title={getContinueButtonTooltip(chapter, allChapters)}
                >
                  <PlusIcon className="w-3 h-3" />
                  {t("chapter.continue_chapter")}
                </button>

                <button
                  onClick={() => onFork(chapter.id.toString())}
                  className="btn btn-xs btn-accent gap-1"
                  disabled={!address}
                  title={
                    !address
                      ? t("wallet.connect")
                      : t("chapter.fork_tooltip_fee", { fee: formatEther(BigInt(chapter.forkFee)) })
                  }
                >
                  <ShareIcon className="w-3 h-3" />
                  {t("chapter.fork_chapter")}
                  {chapter.forkFee && chapter.forkFee !== 0n && (
                    <span className="badge badge-warning badge-xs">{formatEther(BigInt(chapter.forkFee))} STT</span>
                  )}
                </button>
              </div>
            </div>

            {/* 分叉提示 */}
            {childChapters.length > 1 && (
              <div className="mt-2 text-xs text-warning flex items-center gap-1">
                <ShareIcon className="w-3 h-3" />
                <span>{t("chapter.has_forks", { count: childChapters.length })}</span>
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
                t={t}
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
  onTip: (chapterId: string) => void;
  onContinue: (chapterId: string) => void;
  storyId: string;
  canUserContinueChapter: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => boolean;
  getContinueButtonTooltip: (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({ chapters, onFork, onTip, onContinue, storyId, canUserContinueChapter, getContinueButtonTooltip, t }) => {
  // 构建树形结构
  const buildTree = () => {
    const rootChapters = chapters.filter(chapter => chapter.parentId === 0n);
    return rootChapters.sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
  };

  const getChildren = (parentId: string) => {
    return chapters.filter(chapter => chapter.parentId.toString() === parentId).sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
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
          <span>{t("story.detail.total_chapters", { count: chapters.length })}</span>
          <span>
            {t("story.detail.fork_points", { count: chapters.filter(c => getChildren(c.id.toString()).length > 1).length })}
          </span>
        </div>
        <div className="text-xs text-base-content/50">{t("story.detail.tree_help")}</div>
      </div>

      {/* 树形结构 */}
      <div className="space-y-6">
        {rootChapters.map((rootChapter, index) => {
          const children = getChildren(rootChapter.id.toString());
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
              t={t}
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
  const { t } = useLanguage();
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
      notification.error(t("error.wallet_connect_required"));
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      notification.error(t("error.title_content_required"));
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

      notification.success(t("success.chapter_created"));
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");

      // Clear cache immediately for better UX
      chainDataService.clearCacheByPattern("story");
      chainDataService.clearCacheByPattern("chapter");

      // 延迟重新加载数据以确保区块链状态更新
      setTimeout(() => {
        onChapterAdded();
      }, 3000); // Increase delay to 3 seconds for better IPFS sync

      onClose();
    } catch (error) {
      console.error("创建章节失败:", error);
      notification.error(error instanceof Error ? error.message : t("error.chapter_create_failed"));
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
          <h2 className="text-xl font-bold mb-4">{t("modal.add_chapter.title")}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_title")}</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder={t("modal.add_chapter.title_placeholder")}
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_content")}</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full h-48"
                placeholder={t("modal.add_chapter.content_placeholder")}
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.fork_fee")}</span>
                <span className="label-text-alt">{t("modal.add_chapter.fork_fee_unit")}</span>
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
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_image")}</span>
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
                {t("button.cancel")}
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("modal.add_chapter.creating")}
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    {t("modal.add_chapter.create")}
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
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    forkFee: "0",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCid, setImageCid] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      notification.error(t("error.wallet_connect_required"));
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      notification.error(t("error.title_content_required"));
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
        chapterNumber: Number(parentChapter.chapterNumber) + 1,
        image: imageCid,
      };

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约创建章节，作者续写自己的章节不需要支付费用
      await createChapter({
        functionName: "createChapter",
        args: [BigInt(storyId), BigInt(parentChapter.id), ipfsHash, parseEther(formData.forkFee)],
      });

      notification.success(t("success.chapter_continued"));
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");

      // Clear cache immediately for better UX
      chainDataService.clearCacheByPattern("story");
      chainDataService.clearCacheByPattern("chapter");

      // 延迟重新加载数据以确保区块链状态更新
      setTimeout(() => {
        onChapterAdded();
      }, 3000); // Increase delay to 3 seconds

      onClose();
    } catch (error) {
      console.error("续写章节失败:", error);
      notification.error(error instanceof Error ? error.message : t("error.chapter_continue_failed"));
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
          <h2 className="text-xl font-bold mb-4">
            {t("modal.continue_chapter.title", { number: Number(parentChapter.chapterNumber) + 1 })}
          </h2>

          {/* 显示父章节信息 */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm text-base-content/70 mb-2">{t("modal.continue_chapter.based_on")}</h3>
            <p className="font-medium">{t("chapter.title", { number: Number(parentChapter.chapterNumber) })}</p>
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <UserIcon className="w-3 h-3" />
              <Address address={parentChapter.author} size="sm" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_title")}</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder={t("modal.add_chapter.title_placeholder")}
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_content")}</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full h-48"
                placeholder={t("modal.continue_chapter.content_placeholder")}
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.fork_fee")}</span>
                <span className="label-text-alt text-info">{t("modal.continue_chapter.new_chapter_fee_desc")}</span>
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
              <div className="label">
                <span className="label-text-alt text-base-content/60">
                  {t("modal.continue_chapter.new_chapter_fee_explanation")}
                </span>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_image")}</span>
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
                {t("button.cancel")}
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("modal.continue_chapter.continuing")}
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    {t("modal.continue_chapter.continue")}
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
  const { t } = useLanguage();
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
      notification.error(t("error.wallet_connect_required"));
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      notification.error(t("error.title_content_required"));
      return;
    }

    // 检查fork费用
    const requiredFee = parseFloat(forkFeeRequired);
    if (requiredFee > 0) {
      const confirm = window.confirm(t("prompt.fork_confirm", { fee: forkFeeRequired }));
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
        chapterNumber: Number(parentChapter.chapterNumber) + 1, // 下一章编号
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

      notification.success(t("success.chapter_forked"));
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");

      // Clear all cache for fork operations since they can affect multiple stories
      chainDataService.clearCache();

      // Increase delay for fork operations since they create new chapters
      setTimeout(() => {
        onForkSuccess();
      }, 5000); // Increased to 5 seconds for fork operations

      onClose();
    } catch (error) {
      console.error("分叉失败:", error);
      notification.error(error instanceof Error ? error.message : t("error.chapter_fork_failed"));
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
          <h2 className="text-xl font-bold mb-4">{t("modal.fork_chapter.title")}</h2>

          {/* 显示原章节信息 */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm text-base-content/70 mb-2">{t("modal.continue_chapter.based_on")}</h3>
            <p className="font-medium">{t("chapter.title", { number: Number(parentChapter.chapterNumber) })}</p>
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <UserIcon className="w-3 h-3" />
              <Address address={parentChapter.author} size="sm" />
            </div>
            <div className="text-xs text-base-content/50 mt-2">{t("modal.fork_chapter.chapter_note")}</div>
          </div>

          {/* 如果需要支付fork费用，显示提醒 */}
          {forkFeeRequired !== "0" && (
            <div className="alert alert-warning mb-4">
              <InformationCircleIcon className="w-5 h-5" />
              <div>
                <div className="font-semibold">{t("modal.fork_chapter.fee_required")}</div>
                <div className="text-sm">{t("modal.fork_chapter.fee_description", { fee: forkFeeRequired })}</div>
                <div className="text-xs text-base-content/60 mt-1">{t("modal.fork_chapter.fee_explanation")}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 需要支付的分叉费用显示 */}
            {forkFeeRequired !== "0" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-warning">
                    {t("modal.fork_chapter.payment_required")}
                  </span>
                </label>
                <div className="input input-bordered w-full bg-warning/10 text-warning font-bold flex items-center">
                  {forkFeeRequired} STT
                  <span className="text-xs text-base-content/60 ml-2">
                    ({t("modal.fork_chapter.payment_to_author")})
                  </span>
                </div>
              </div>
            )}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.fork_chapter.fork_title")}</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder={t("modal.fork_chapter.title_placeholder")}
                disabled={isForking}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.fork_chapter.fork_content")}</span>
              </label>
              <textarea
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="textarea textarea-bordered w-full h-48"
                placeholder={t("modal.fork_chapter.content_placeholder")}
                disabled={isForking}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.fork_fee")}</span>
                <span className="label-text-alt text-info">{t("modal.fork_chapter.new_chapter_fee_desc")}</span>
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
              <div className="label">
                <span className="label-text-alt text-base-content/60">
                  {t("modal.fork_chapter.new_chapter_fee_explanation")}
                </span>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("modal.add_chapter.chapter_image")}</span>
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
                {t("button.cancel")}
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={isForking}>
                {isForking ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("modal.fork_chapter.forking")}
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-4 h-4" />
                    {forkFeeRequired !== "0"
                      ? t("modal.fork_chapter.fork_button_fee", { fee: forkFeeRequired })
                      : t("modal.fork_chapter.fork_button")}
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
  const canUserContinueChapter = useCallback(
    (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => {
      if (!address) return false;

      // 只有章节作者才能续写自己的章节
      if (chapter.author.toLowerCase() !== address.toLowerCase()) return false;

      // 只有最新章节才能续写（即没有子章节的章节）
      const hasChildren = allChapters.some(c => c.parentId === chapter.id);
      return !hasChildren;
    },
    [address],
  );

  // 获取续写按钮的提示文本
  const getContinueButtonTooltip = useCallback(
    (chapter: ChapterWithMetadata, allChapters: ChapterWithMetadata[]) => {
      if (!address) return t("wallet.connect");
      if (chapter.author.toLowerCase() !== address.toLowerCase()) return t("chapter.only_author_continue");

      const hasChildren = allChapters.some(c => c.parentId === chapter.id);
      if (hasChildren) return t("chapter.only_latest_continue");

      return t("chapter.continue_this_chapter");
    },
    [address, t],
  );

  // 直接使用fetch获取数据，避开hook问题
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!storyId) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
          // Clear all caches when refreshing to ensure we get latest data
          chainDataService.clearCache();
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
          throw new Error(t("error.story_data_fetch_failed", { status: storyRes.status }));
        }

        // 获取章节数据
        const chaptersRes = await fetch(`/api/data/chapters?storyId=${storyId}&t=${timestamp}`);
        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          setChapters(chaptersData.chapters || []);
        }
      } catch (err) {
        console.error("获取数据失败:", err);
        setError(err instanceof Error ? err.message : t("error.fetch_data_failed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [storyId, t],
  );

  // 加载故事元数据
  const loadStoryMetadata = useCallback(
    async (ipfsHash: string) => {
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
        console.error(t("error.load_story_metadata_failed"), err);
      } finally {
        setMetadataLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleTip = async (chapterId: string) => {
    if (!address) {
      notification.error(t("wallet.connect"));
      return;
    }

    const tipAmount = prompt(t("prompt.tip_amount"), "0.01");
    if (!tipAmount || parseFloat(tipAmount) <= 0) return;

    try {
      await tip({
        functionName: "tip",
        args: [BigInt(chapterId)],
        value: parseEther(tipAmount),
      });
      notification.success(t("success.tipped"));

      // Clear cache and reload data immediately
      chainDataService.clearCacheByPattern("story");
      chainDataService.clearCacheByPattern("chapter");

      // Reduced delay since we're clearing cache explicitly
      setTimeout(() => {
        fetchData(true);
      }, 2000); // Reduced from 3 seconds to 2 seconds
    } catch (error) {
      console.error("打赏失败:", error);
      notification.error(t("error.tip_failed"));
    }
  };

  const handleContinueChapter = (chapterId: string) => {
    if (!address) {
      notification.error(t("error.wallet_connect_required"));
      return;
    }

    // 找到要续写的章节
    const chapter = chaptersWithMetadata.find(ch => ch.id.toString() === chapterId);
    if (!chapter) {
      notification.error(t("error.chapter_not_exist"));
      return;
    }

    // 检查续写权限：只有章节作者可以续写自己的章节
    if (chapter.author.toLowerCase() !== address.toLowerCase()) {
      notification.error(t("error.only_author_continue"));
      return;
    }

    setSelectedChapter(chapter);
    setShowContinueChapter(true);
  };

  const handleFork = (chapterId: string) => {
    if (!address) {
      notification.error(t("error.wallet_connect_required"));
      return;
    }

    // 找到要分叉的章节
    const chapter = chaptersWithMetadata.find(ch => ch.id.toString() === chapterId);
    if (!chapter) {
      notification.error(t("error.chapter_not_exist"));
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
          <span>
            {t("story.detail.load_failed")}: {error}
          </span>
          <button className="btn btn-sm" onClick={() => fetchData()}>
            {t("story.detail.retry")}
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
          <span>{t("story.detail.story_not_found")}</span>
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
          <span>{t("story.detail.updating")}</span>
        </div>
      )}

      {/* 返回按钮 */}
      <button onClick={() => router.back()} className="btn btn-ghost gap-2 mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        {t("story.detail.back")}
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
                title={storyMetadata?.title || t("explore.story_alt", { id: storyId })}
                storyId={storyId}
                className="h-64 w-full"
                t={t}
              />
            )}
          </div>
        )}

        <div className="card-body">
          {/* 标题和基本信息 */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-2">
              {storyMetadata?.title || t("explore.story_alt", { id: storyId })}
            </h1>
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
                <span>{new Date(Number(story.createdTime) * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <LikeButton
                tokenId={BigInt(storyId)}
                isStory={true}
                currentLikes={Number(story.likes)}
                showCount={true}
                onLikeSuccess={handleLikeSuccess}
              />

              <div className="flex items-center gap-1 text-sm text-base-content/70">
                <ShareIcon className="w-4 h-4" />
                <span>
                  {story.forkCount} {t("story.forks")}
                </span>
              </div>

              {/* Story tips removed - only show fork revenue now */}
            </div>

            {story.author.toLowerCase() === address?.toLowerCase() && (
              <></>
              // <button
              //   onClick={() => setShowAddChapter(true)}
              //   className="btn btn-primary gap-2"
              //   title={t("story.detail.add_chapter_tooltip")}
              // >
              //   <PlusIcon className="w-4 h-4" />
              //   {t("story.add_chapter")}
              // </button>
            )}

            {/* 续写故事按钮 - 只有最新章节的作者可以续写 */}
            {address && chaptersWithMetadata.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // 续写最后一章
                    const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                    handleContinueChapter(lastChapter.id.toString());
                  }}
                  className="btn btn-secondary gap-2"
                  disabled={
                    !canUserContinueChapter(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)
                  }
                  title={getContinueButtonTooltip(
                    chaptersWithMetadata[chaptersWithMetadata.length - 1],
                    chaptersWithMetadata,
                  )}
                >
                  <PlusIcon className="w-4 h-4" />
                  {t("story.detail.continue_story")}
                </button>

                <button
                  onClick={() => {
                    const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                    handleFork(lastChapter.id.toString());
                  }}
                  className="btn btn-outline gap-2"
                  title={t("story.detail.fork_story_tooltip")}
                >
                  <ShareIcon className="w-4 h-4" />
                  {t("story.detail.fork_story_button")}
                </button>
              </div>
            )}

            {/* 添加第一章的按钮 - 当没有章节时显示 */}
            {address && chaptersWithMetadata.length === 0 && (
              <button
                onClick={() => setShowAddChapter(true)}
                className="btn btn-secondary gap-2"
                disabled={story.author.toLowerCase() !== address.toLowerCase()}
                title={
                  story.author.toLowerCase() !== address.toLowerCase()
                    ? t("story.detail.only_author_can_add_first_chapter")
                    : t("story.detail.add_first_chapter")
                }
              >
                <PlusIcon className="w-4 h-4" />
                {story.author.toLowerCase() === address.toLowerCase()
                  ? t("story.detail.add_first_chapter")
                  : t("story.detail.continue_first_chapter")}
              </button>
            )}

            {!address && <div className="text-sm text-base-content/60">{t("story.detail.connect_wallet_actions")}</div>}
          </div>
        </div>
      </div>

      {/* 章节树形结构 */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-primary" />
            {t("story.detail.story_structure")}
          </h2>
          {/* 快速操作按钮 */}
          {address && chaptersWithMetadata.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                  handleContinueChapter(lastChapter.id.toString());
                }}
                className="btn btn-secondary gap-2"
                disabled={
                  !canUserContinueChapter(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)
                }
                title={getContinueButtonTooltip(
                  chaptersWithMetadata[chaptersWithMetadata.length - 1],
                  chaptersWithMetadata,
                )}
              >
                <PlusIcon className="w-5 h-5" />
                {t("story.detail.continue_latest")}
              </button>
              <button
                onClick={() => {
                  const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                  handleFork(lastChapter.id.toString());
                }}
                className="btn btn-outline gap-2"
                title={t("story.detail.fork_latest")}
              >
                <ShareIcon className="w-5 h-5" />
                {t("story.detail.fork_latest")}
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
              t={t}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpenIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/70 mb-2">{t("story.detail.no_chapters")}</p>
            <p className="text-sm text-base-content/50 mb-4">{t("story.detail.no_chapters_desc")}</p>
            {address ? (
              <button
                onClick={() => setShowAddChapter(true)}
                className="btn btn-primary mt-2 gap-2"
                disabled={story.author.toLowerCase() !== address.toLowerCase()}
                title={
                  story.author.toLowerCase() !== address.toLowerCase()
                    ? t("story.detail.only_author_can_add_first_chapter")
                    : t("story.detail.add_first_chapter")
                }
              >
                <PlusIcon className="w-4 h-4" />
                {story.author.toLowerCase() === address.toLowerCase()
                  ? t("story.detail.add_first_chapter")
                  : t("story.detail.continue_first_chapter")}
              </button>
            ) : (
              <div className="text-sm text-base-content/60">{t("story.detail.connect_wallet_desc")}</div>
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
          // Add delay to ensure blockchain data is synced before refreshing
          setTimeout(() => {
            fetchData(true);
            console.log("Chapter added, reloaded data after delay");
          }, 1000); // Additional 1 second delay for the callback
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
            // Add delay to ensure blockchain data is synced before refreshing
            setTimeout(() => {
              fetchData(true);
              console.log("Chapter continued, reloaded data after delay");
            }, 1000); // Additional 1 second delay for the callback
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
            // Add delay to ensure blockchain data is synced before refreshing
            setTimeout(() => {
              fetchData(true);
              console.log("Story forked, reloaded data after delay");
            }, 1000); // Additional 1 second delay for the callback
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
                handleContinueChapter(lastChapter.id.toString());
              }}
              className="btn btn-secondary btn-circle shadow-lg hover:shadow-xl transition-all"
              disabled={
                !canUserContinueChapter(chaptersWithMetadata[chaptersWithMetadata.length - 1], chaptersWithMetadata)
              }
              title={getContinueButtonTooltip(
                chaptersWithMetadata[chaptersWithMetadata.length - 1],
                chaptersWithMetadata,
              )}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                handleFork(lastChapter.id.toString());
              }}
              className="btn btn-outline btn-circle shadow-lg hover:shadow-xl transition-all"
              title={t("story.detail.fork_latest")}
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
