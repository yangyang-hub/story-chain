"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CommentSection } from "~~/components/interactions/CommentSection";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { ChapterData } from "~~/lib/monitoring/types";
import { type ChapterMetadata, getJSONFromIPFS } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

interface ChapterWithMetadata extends ChapterData {
  metadata?: ChapterMetadata;
}

interface StoryMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  content?: string;
  image?: string;
}

// 章节内容显示组件
const ChapterContent: React.FC<{ cid: string }> = ({ cid }) => {
  const [content, setContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (!cid) {
        setError("无效的内容标识");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await getJSONFromIPFS(cid);
        if (data?.content) {
          setContent(data.content);
        } else {
          setError("内容为空");
        }

        // 加载章节标题
        if (data?.title) {
          setChapterTitle(data.title);
        }

        // 加载章节图片
        if (data?.image) {
          setImageUrl(`https://gateway.pinata.cloud/ipfs/${data.image}`);
          setImageLoading(true);
        }
      } catch (err) {
        console.error("加载内容失败:", err);
        setError("加载内容失败");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [cid]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 章节标题 */}
      {chapterTitle && (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary mb-4">{chapterTitle}</h3>
        </div>
      )}

      {/* 章节图片 */}
      {imageUrl && !imageError && (
        <div className="text-center">
          <div className="relative inline-block max-w-full">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-base-200 rounded-lg">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            )}
            <img
              src={imageUrl}
              alt={chapterTitle || "章节插图"}
              className="max-w-full max-h-96 rounded-lg shadow-lg mx-auto"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* 章节内容 */}
      <div className="prose prose-lg max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed text-base-content">{content}</div>
      </div>
    </div>
  );
};

// 分叉选择组件
const ForkSelector: React.FC<{
  forks: ChapterWithMetadata[];
  currentChapterId: string;
  storyId: string;
}> = ({ forks, currentChapterId, storyId }) => {
  if (forks.length <= 1) return null;

  return (
    <div className="card bg-base-100 shadow-sm border border-warning/20 mb-6">
      <div className="card-body">
        <h3 className="card-title text-warning">
          <ShareIcon className="w-5 h-5" />
          故事分叉点
        </h3>
        <p className="text-sm text-base-content/70 mb-4">
          这里有 {forks.length} 个不同的故事发展方向，选择一个继续阅读：
        </p>

        <div className="grid gap-3">
          {forks.map((fork, index) => (
            <a
              key={fork.id}
              href={`/story/${storyId}/chapter/${fork.id}`}
              className={`card bg-base-200 hover:bg-base-300 transition-colors border ${
                fork.id === currentChapterId ? "border-primary bg-primary/5" : "border-base-300"
              }`}
            >
              <div className="card-body p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <span className="badge badge-outline">分支 {index + 1}</span>
                    <UserIcon className="w-3 h-3" />
                    <Address address={fork.author} size="sm" />
                  </div>
                  {fork.id === currentChapterId && <span className="badge badge-primary badge-sm">当前</span>}
                </div>

                <div className="text-sm">
                  <div className="text-base-content/50">点击阅读这个分支</div>
                </div>

                <div className="flex justify-between items-center text-xs text-base-content/60 mt-2">
                  <span>{new Date(fork.createdTime * 1000).toLocaleDateString()}</span>
                  <div className="flex items-center gap-4">
                    <span>❤️ {fork.likes}</span>
                    <span>💰 {formatEther(BigInt(fork.totalTips))} STT</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

const ChapterReadingPage = () => {
  const { id: storyId, chapterId } = useParams();
  const router = useRouter();
  const { address } = useAccount();

  const [chapter, setChapter] = useState<ChapterWithMetadata | null>(null);
  const [chapters, setChapters] = useState<ChapterWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyMetadata, setStoryMetadata] = useState<StoryMetadata | null>(null);

  // 获取数据
  const fetchData = useCallback(async () => {
    if (!storyId || !chapterId) return;

    try {
      setLoading(true);
      setError(null);

      // 获取故事数据
      const storyRes = await fetch(`/api/data/stories/${storyId}`);
      if (storyRes.ok) {
        const storyData = await storyRes.json();
        const storyInfo = storyData.story;

        // 加载故事元数据
        if (storyInfo?.ipfsHash) {
          try {
            const metadata = await getJSONFromIPFS(storyInfo.ipfsHash);
            setStoryMetadata(metadata);
          } catch (err) {
            console.error("加载故事元数据失败:", err);
          }
        }
      }

      // 获取所有章节数据
      const chaptersRes = await fetch(`/api/data/chapters?storyId=${storyId}`);
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json();
        const allChapters = chaptersData.chapters || [];
        setChapters(allChapters);

        // 找到当前章节
        const currentChapter = allChapters.find((ch: any) => ch.id === chapterId);
        if (currentChapter) {
          setChapter(currentChapter);
        } else {
          throw new Error("章节不存在");
        }
      } else {
        throw new Error("获取章节数据失败");
      }
    } catch (err) {
      console.error("获取数据失败:", err);
      setError(err instanceof Error ? err.message : "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, [storyId, chapterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 获取导航信息
  const getNavigationInfo = useCallback(() => {
    if (!chapter || chapters.length === 0) {
      return { prevChapter: null, nextChapters: [], forks: [] };
    }

    // 获取父章节（上一章）
    const prevChapter = chapter.parentId !== "0" ? chapters.find(ch => ch.id === chapter.parentId) : null;

    // 获取子章节（下一章们）
    const nextChapters = chapters.filter(ch => ch.parentId === chapter.id);

    // 获取同级分叉（包括当前章节）
    const forks = chapters.filter(ch => ch.parentId === chapter.parentId);

    return { prevChapter, nextChapters, forks };
  }, [chapter, chapters]);

  const { prevChapter, nextChapters, forks } = getNavigationInfo();

  // 处理打赏
  const { writeContractAsync: tip } = useScaffoldWriteContract("StoryChain");

  const handleTip = async () => {
    if (!address || !chapter) {
      notification.error("请先连接钱包");
      return;
    }

    const amount = window.prompt("输入打赏金额 (STT):", "0.01");
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      await tip({
        functionName: "tip",
        args: [BigInt(storyId as string), BigInt(chapter.id)],
        value: parseEther(amount),
      });

      notification.success("打赏成功！");
      fetchData(); // 刷新数据
    } catch (error) {
      console.error("打赏失败:", error);
      notification.error("打赏失败");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/70">加载章节中...</p>
        </div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="alert alert-error max-w-md">
            <span>{error || "章节不存在"}</span>
          </div>
          <button onClick={() => router.push(`/story/${storyId}`)} className="btn btn-primary mt-4">
            返回故事页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push(`/story/${storyId}`)} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            返回故事
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold text-base-content">{storyMetadata?.title || `故事 #${storyId}`}</h1>
            <p className="text-sm text-base-content/60">第 {chapter.chapterNumber} 章</p>
          </div>

          <div className="flex items-center gap-2">
            <LikeButton tokenId={BigInt(chapter.id)} isStory={false} currentLikes={chapter.likes} showCount={true} />
          </div>
        </div>

        {/* 分叉选择器 */}
        <ForkSelector forks={forks} currentChapterId={chapterId as string} storyId={storyId as string} />

        {/* 章节内容 */}
        <div className="card bg-base-100 shadow-sm border border-base-300 mb-6">
          <div className="card-body">
            {/* 章节标题和信息 */}
            <div className="border-b border-base-300 pb-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-base-content">第 {chapter.chapterNumber} 章</h2>
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <UserIcon className="w-4 h-4" />
                  <Address address={chapter.author} />
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-base-content/60">
                <span>{new Date(chapter.createdTime * 1000).toLocaleString()}</span>
                <span>💰 {formatEther(BigInt(chapter.totalTips))} STT 打赏</span>
                {chapter.forkFee && chapter.forkFee !== "0" && (
                  <span>🔀 分叉费用: {formatEther(BigInt(chapter.forkFee))} STT</span>
                )}
              </div>
            </div>

            {/* 章节内容 */}
            <ChapterContent cid={chapter.ipfsHash} />
          </div>
        </div>

        {/* 章节导航 */}
        <div className="flex justify-between items-center mb-6">
          {/* 上一章 */}
          <div className="flex-1">
            {prevChapter ? (
              <a href={`/story/${storyId}/chapter/${prevChapter.id}`} className="btn btn-outline gap-2">
                <ChevronLeftIcon className="w-4 h-4" />
                上一章
              </a>
            ) : (
              <div></div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleTip}
              className="btn btn-secondary btn-sm gap-2"
              disabled={!address}
              title={!address ? "请先连接钱包" : "给章节作者打赏"}
            >
              <CurrencyDollarIcon className="w-4 h-4" />
              打赏
            </button>

            <a href={`/story/${storyId}#chapter-${chapter.id}`} className="btn btn-primary btn-sm gap-2">
              <PlusIcon className="w-4 h-4" />
              续写
            </a>

            <a href={`/story/${storyId}#fork-${chapter.id}`} className="btn btn-accent btn-sm gap-2">
              <ShareIcon className="w-4 h-4" />
              分叉
            </a>
          </div>

          {/* 下一章 */}
          <div className="flex-1 flex justify-end">
            {nextChapters.length === 1 ? (
              <a href={`/story/${storyId}/chapter/${nextChapters[0].id}`} className="btn btn-outline gap-2">
                下一章
                <ChevronRightIcon className="w-4 h-4" />
              </a>
            ) : nextChapters.length > 1 ? (
              <div className="dropdown dropdown-end">
                <button className="btn btn-outline gap-2">
                  下一章 ({nextChapters.length})
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <ul className="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow-xl border border-base-300 mt-1">
                  {nextChapters.map((nextChapter, index) => (
                    <li key={nextChapter.id}>
                      <a
                        href={`/story/${storyId}/chapter/${nextChapter.id}`}
                        className="flex justify-between items-center"
                      >
                        <span>分支 {index + 1}</span>
                        <span className="text-xs text-base-content/60">
                          {new Date(nextChapter.createdTime * 1000).toLocaleDateString()}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </div>

        {/* 评论区 */}
        <CommentSection tokenId={BigInt(chapter.id)} isStory={false} />
      </div>
    </div>
  );
};

export default ChapterReadingPage;
