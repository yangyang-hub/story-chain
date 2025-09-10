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
import { IPFSContentViewer } from "~~/components/ipfs/IPFSViewer";
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

const ChapterCard: React.FC<{
  chapter: ChapterWithMetadata;
  onFork: (chapterId: string) => void;
  onTip: (storyId: string, chapterId: string) => void;
  onContinue: (chapterId: string) => void;
}> = ({ chapter, onFork, onTip, onContinue }) => {
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
            title={!address ? "请先连接钱包" : "给章节作者打赏"}
          >
            <CurrencyDollarIcon className="w-4 h-4" />
            打赏
          </button>
          <button
            onClick={() => onContinue(chapter.id)}
            className="btn btn-secondary btn-sm gap-1"
            disabled={!address}
            title={!address ? "请先连接钱包" : "续写此章节"}
          >
            <PlusIcon className="w-4 h-4" />
            续写
          </button>
          <button
            onClick={() => onFork(chapter.id)}
            className="btn btn-primary btn-sm gap-1"
            disabled={!address}
            title={!address ? "请先连接钱包" : "基于此章节创建分叉故事"}
          >
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
    if (parentChapter && parentChapter.forkFee) {
      setForkFeeRequired(formatEther(BigInt(parentChapter.forkFee)));
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

      // 调用合约创建章节，如果有fork费用需要支付
      const value = forkFeeRequired !== "0" ? parseEther(forkFeeRequired) : BigInt(0);

      await createChapter({
        functionName: "createChapter",
        args: [BigInt(storyId), BigInt(parentChapter.id), ipfsHash, parseEther(formData.forkFee)],
        value: value,
      });

      notification.success("章节续写成功！");
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");
      onChapterAdded();
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

          {/* 如果需要支付fork费用，显示提醒 */}
          {forkFeeRequired !== "0" && (
            <div className="alert alert-warning mb-4">
              <InformationCircleIcon className="w-5 h-5" />
              <div>
                <div className="font-semibold">需要支付续写费用</div>
                <div className="text-sm">续写此章节需要支付 {forkFeeRequired} ETH</div>
              </div>
            </div>
          )}

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
                    {forkFeeRequired !== "0" ? `支付 ${forkFeeRequired} ETH 并续写` : "续写章节"}
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
    if (parentChapter && parentChapter.forkFee) {
      setForkFeeRequired(formatEther(BigInt(parentChapter.forkFee)));
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
      setIsForking(true);

      // 创建故事元数据（fork是创建新故事）
      const metadata = {
        title: formData.title,
        content: formData.content,
        description: `基于第${parentChapter.chapterNumber}章的分叉故事`,
        author: address,
        timestamp: Date.now(),
        originalStoryId: storyId,
        originalChapterId: parentChapter.id.toString(),
        image: imageCid,
      };

      // 上传到IPFS
      const ipfsHash = await uploadChapterMetadata(metadata);

      // 调用合约fork故事，需要支付fork费用
      const value = forkFeeRequired !== "0" ? parseEther(forkFeeRequired) : BigInt(0);

      await forkStory({
        functionName: "forkStory",
        args: [BigInt(storyId), BigInt(parentChapter.id), ipfsHash, parseEther(formData.forkFee)],
        value: value,
      });

      notification.success("故事分叉成功！");
      setFormData({ title: "", content: "", forkFee: "0" });
      setImageUrl("");
      setImageCid("");
      onForkSuccess();
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
          <h2 className="text-xl font-bold mb-4">分叉故事</h2>

          {/* 显示原章节信息 */}
          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm text-base-content/70 mb-2">基于章节：</h3>
            <p className="font-medium">第 {parentChapter.chapterNumber} 章</p>
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <UserIcon className="w-3 h-3" />
              <Address address={parentChapter.author} size="sm" />
            </div>
            <div className="text-xs text-base-content/50 mt-2">分叉将创建一个新的独立故事分支</div>
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
                <span className="label-text font-medium">新故事标题 *</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="输入新故事的标题..."
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
                placeholder="从这里开始你的新故事分支..."
                disabled={isForking}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">设置续写费用</span>
                <span className="label-text-alt">ETH (其他用户续写此故事时需支付)</span>
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
                <span className="label-text font-medium">故事封面</span>
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
                    {forkFeeRequired !== "0" ? `支付 ${forkFeeRequired} ETH 并分叉` : "创建分叉"}
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
  const [error, setError] = useState<string | null>(null);
  const [storyMetadata, setStoryMetadata] = useState<StoryMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const storyId = id as string;

  // 直接使用fetch获取数据，避开hook问题
  const fetchData = useCallback(async () => {
    if (!storyId) return;

    try {
      setLoading(true);
      setError(null);

      // 获取故事数据
      const storyRes = await fetch(`/api/data/stories/${storyId}`);
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
      const chaptersRes = await fetch(`/api/data/chapters?storyId=${storyId}`);
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData.chapters || []);
      }
    } catch (err) {
      console.error("获取数据失败:", err);
      setError(err instanceof Error ? err.message : "获取数据失败");
    } finally {
      setLoading(false);
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
    // 点赞成功后重新获取数据
    fetchData();
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
      fetchData(); // 重新获取数据
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

            {/* 续写故事按钮 - 任何连接钱包的用户都可以续写 */}
            {address && chaptersWithMetadata.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // 续写最后一章
                    const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                    handleContinueChapter(lastChapter.id);
                  }}
                  className="btn btn-secondary gap-2"
                  title="续写故事的最新章节"
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

      {/* 章节列表 */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">章节列表</h2>
          {/* 快速续写按钮 */}
          {address && chaptersWithMetadata.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                  handleContinueChapter(lastChapter.id);
                }}
                className="btn btn-secondary gap-1"
                title="续写最新章节"
              >
                <PlusIcon className="w-4 h-4" />
                续写最新章节
              </button>
              <button
                onClick={() => {
                  const lastChapter = chaptersWithMetadata[chaptersWithMetadata.length - 1];
                  handleFork(lastChapter.id);
                }}
                className="btn btn-outline btn-sm gap-1"
                title="分叉最新章节"
              >
                <ShareIcon className="w-4 h-4" />
                分叉最新章节
              </button>
            </div>
          )}
        </div>

        {chaptersWithMetadata.length > 0 ? (
          <div className="space-y-4">
            {chaptersWithMetadata.map(chapter => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                onFork={handleFork}
                onTip={handleTip}
                onContinue={handleContinueChapter}
              />
            ))}
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
          fetchData();
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
            fetchData();
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
            fetchData();
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
              title="续写最新章节"
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
