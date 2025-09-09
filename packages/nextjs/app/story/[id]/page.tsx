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
  HeartIcon,
  InformationCircleIcon,
  PlusIcon,
  ShareIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CommentSection } from "~~/components/interactions/CommentSection";
import { LikeButton } from "~~/components/interactions/LikeButton";
import { ImageUploader } from "~~/components/ipfs/IPFSUploader";
import { IPFSContentViewer } from "~~/components/ipfs/IPFSViewer";
import { Address } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useStoryPageData } from "~~/hooks/useChainData";
import { ChapterData } from "~~/lib/monitoring/types";
import { type ChapterMetadata, getJSONFromIPFS, uploadChapterMetadata } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

interface ChapterWithMetadata extends ChapterData {
  metadata?: any;
}

const ChapterCard: React.FC<{
  chapter: ChapterWithMetadata;
  onFork: (chapterId: string) => void;
  onTip: (storyId: string, chapterId: string) => void;
}> = ({ chapter, onFork, onTip }) => {
  const { address } = useAccount();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const data = await getJSONFromIPFS(chapter.ipfsHash);
        setMetadata(data);
      } catch (error) {
        console.error("加载章节元数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    if (chapter.ipfsHash) {
      loadMetadata();
    }
  }, [chapter.ipfsHash]);

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
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-primary">
      <div className="card-body">
        {/* 章节标题和编号 */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="card-title text-lg">
            第 {chapter.chapterNumber} 章{metadata?.title && `: ${metadata.title}`}
          </h3>
          <div className="badge badge-primary badge-sm">#{chapter.id}</div>
        </div>

        {/* 作者和时间 */}
        <div className="flex items-center gap-4 text-sm text-base-content/70 mb-3">
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <Address address={chapter.author} size="sm" />
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{new Date(chapter.createdTime * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        {/* 章节内容预览 */}
        <div className="prose prose-sm max-w-none mb-4">
          <IPFSContentViewer cid={chapter.ipfsHash} contentType="json" className="border-none bg-transparent p-0" />
        </div>

        {/* 统计信息和交互 */}
        <div className="flex justify-between items-center text-sm mb-4">
          <div className="flex items-center gap-4">
            <LikeButton tokenId={BigInt(chapter.id)} isStory={false} currentLikes={chapter.likes} showCount={true} />

            <div className="flex items-center gap-1 text-base-content/70">
              <ShareIcon className="w-4 h-4" />
              <span>{chapter.forkCount}</span>
            </div>

            <div className="flex items-center gap-1 text-base-content/70">
              <CurrencyDollarIcon className="w-4 h-4" />
              <span>{formatEther(BigInt(chapter.totalTips))} ETH</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="card-actions justify-end">
          <button
            onClick={() => onTip(chapter.storyId, chapter.id)}
            className="btn btn-outline btn-sm gap-1"
            disabled={!address}
          >
            <CurrencyDollarIcon className="w-4 h-4" />
            打赏
          </button>
          <button onClick={() => onFork(chapter.id)} className="btn btn-primary btn-sm gap-1" disabled={!address}>
            <ShareIcon className="w-4 h-4" />
            分叉
          </button>
        </div>
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
      onChapterAdded();
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

const StoryDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const { t } = useLanguage();

  const [showAddChapter, setShowAddChapter] = useState(false);

  const storyId = id as string;

  // 使用 useStoryPageData hook 获取故事和章节数据
  const { story, chapters, loading, error, refetch } = useStoryPageData(storyId);

  // 为每个章节添加 metadata 字段以支持类型检查
  const chaptersWithMetadata: ChapterWithMetadata[] = (chapters || []).map(chapter => ({
    ...chapter,
    metadata: undefined, // 将由 ChapterCard 组件异步加载
  }));

  // 合约调用函数
  const { writeContractAsync: likeStory } = useScaffoldWriteContract("StoryChain");
  const { writeContractAsync: tip } = useScaffoldWriteContract("StoryChain");

  const handleLikeStory = async () => {
    if (!address) {
      notification.error(t("wallet.connect"));
      return;
    }

    try {
      await likeStory({
        functionName: "likeStory",
        args: [BigInt(storyId)],
      });
      notification.success(t("success.liked"));
      refetch(); // 重新获取数据
    } catch (error) {
      console.error("点赞失败:", error);
      notification.error("点赞失败");
    }
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
      refetch(); // 重新获取数据
    } catch (error) {
      console.error("打赏失败:", error);
      notification.error("打赏失败");
    }
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
          <button className="btn btn-sm" onClick={refetch}>
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
      {/* 返回按钮 */}
      <button onClick={() => router.back()} className="btn btn-ghost gap-2 mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        返回
      </button>

      {/* 故事信息 */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <IPFSContentViewer cid={story.ipfsHash} contentType="json" showUrl={true} />

          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-4">
              <button onClick={handleLikeStory} className="btn btn-outline btn-sm gap-2" disabled={!address}>
                <HeartIcon className="w-4 h-4" />
                点赞 ({story.likes})
              </button>

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
              <button onClick={() => setShowAddChapter(true)} className="btn btn-primary gap-2">
                <PlusIcon className="w-4 h-4" />
                添加章节
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 章节列表 */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">章节列表</h2>

        {chaptersWithMetadata.length > 0 ? (
          <div className="space-y-4">
            {chaptersWithMetadata.map(chapter => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                onFork={chapterId => {
                  // 处理分叉逻辑
                  console.log("Fork chapter:", chapterId);
                }}
                onTip={handleTip}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpenIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/70">还没有章节，成为第一个添加章节的人！</p>
            {story.author === address && (
              <button onClick={() => setShowAddChapter(true)} className="btn btn-primary mt-4 gap-2">
                <PlusIcon className="w-4 h-4" />
                添加第一章
              </button>
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
          refetch();
          console.log("Chapter added, reloaded data");
        }}
      />
    </div>
  );
};

export default StoryDetailPage;
