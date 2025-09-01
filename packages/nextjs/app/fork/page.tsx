"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  PhotoIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { ImageUploader } from "~~/components/ipfs/IPFSUploader";
import { IPFSContentViewer } from "~~/components/ipfs/IPFSViewer";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useStoryChain } from "~~/hooks/useStoryChain";
import { type ChapterMetadata, getJSONFromIPFS } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

const ForkStoryPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { t } = useLanguage();
  const { forkStory, isLoading } = useStoryChain();

  // URL参数
  const storyId = searchParams.get("storyId");
  const parentId = searchParams.get("parentId");

  // 表单状态
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    forkFee: "0.01",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCid, setImageCid] = useState("");

  // 原故事/章节信息
  const [parentData, setParentData] = useState<any>(null);
  const [parentMetadata, setParentMetadata] = useState<any>(null);
  const [loadingParent, setLoadingParent] = useState(true);

  // 获取原故事信息
  const { data: originalStory } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "getStory",
    args: storyId ? [BigInt(storyId)] : undefined,
  });

  // 获取原章节信息（如果是分叉章节）
  const { data: originalChapter } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "getChapter",
    args: parentId && parentId !== "0" ? [BigInt(parentId)] : undefined,
  });

  useEffect(() => {
    if (!storyId) {
      notification.error("缺少故事ID参数");
      router.back();
      return;
    }

    const loadParentData = async () => {
      try {
        setLoadingParent(true);

        // 确定是分叉故事还是分叉章节
        let data, metadata;
        if (parentId && parentId !== "0" && originalChapter) {
          // 分叉章节
          data = originalChapter;
          metadata = await getJSONFromIPFS(originalChapter.ipfsHash);
        } else if (originalStory) {
          // 分叉故事
          data = originalStory;
          metadata = await getJSONFromIPFS(originalStory.ipfsHash);
        }

        setParentData(data);
        setParentMetadata(metadata);
      } catch (error) {
        console.error("加载原始内容失败:", error);
        notification.error("加载原始内容失败");
      } finally {
        setLoadingParent(false);
      }
    };

    if (originalStory && (parentId === "0" || originalChapter)) {
      loadParentData();
    }
  }, [storyId, parentId, originalStory, originalChapter, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (cid: string, url: string) => {
    setImageCid(cid);
    setImageUrl(url);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      notification.error(t("form.title.required"));
      return false;
    }
    if (!formData.content.trim()) {
      notification.error(t("form.content.required"));
      return false;
    }
    if (parseFloat(formData.forkFee) < 0) {
      notification.error(t("form.fee.invalid"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      notification.error(t("wallet.connect"));
      return;
    }

    if (!validateForm()) return;

    if (!storyId || !parentData) {
      notification.error("缺少必要的参数");
      return;
    }

    try {
      // 创建章节元数据
      const metadata: ChapterMetadata = {
        title: formData.title,
        content: formData.content,
        author: address,
        timestamp: Date.now(),
        storyId: storyId,
        parentChapterId: parentId || "0",
        chapterNumber: parentData.chapterNumber ? Number(parentData.chapterNumber) + 1 : 1,
        image: imageCid,
      };

      // 计算需要支付的分叉费用
      const forkFeeValue = formatEther(parentData.forkFee || 0n);

      // 调用分叉函数
      await forkStory(BigInt(storyId), BigInt(parentId || "0"), metadata, formData.forkFee, forkFeeValue);

      // 跳转到故事详情页
      router.push(`/story/${storyId}`);
    } catch (error) {
      console.error("分叉失败:", error);
      // 错误处理已在 useStoryChain 中处理
    }
  };

  if (!storyId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="alert alert-error">
          <InformationCircleIcon className="w-6 h-6" />
          <span>缺少故事ID参数</span>
        </div>
      </div>
    );
  }

  if (loadingParent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

  if (!parentData || !parentMetadata) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="alert alert-error">
          <InformationCircleIcon className="w-6 h-6" />
          <span>原始内容不存在或加载失败</span>
        </div>
      </div>
    );
  }

  const isChapterFork = parentId && parentId !== "0";
  const forkFeeEth = formatEther(parentData.forkFee || 0n);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 返回按钮 */}
      <button onClick={() => router.back()} className="btn btn-ghost gap-2 mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        返回
      </button>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShareIcon className="w-8 h-8" />
          {t("story.fork_story")}
        </h1>
        <p className="text-base-content/70">
          {isChapterFork ? "基于现有章节创建新的故事分支" : "基于现有故事创建新的故事线"}
        </p>
      </div>

      {/* 分叉费用提醒 */}
      {parseFloat(forkFeeEth) > 0 && (
        <div className="alert alert-info mb-6">
          <CurrencyDollarIcon className="w-6 h-6" />
          <div>
            <div className="font-semibold">需要支付分叉费用</div>
            <div className="text-sm">
              分叉此{isChapterFork ? "章节" : "故事"}需要支付 {forkFeeEth} ETH 给原作者
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：原始内容 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">原始{isChapterFork ? "章节" : "故事"}</h2>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <IPFSContentViewer
                cid={parentData.ipfsHash}
                contentType="json"
                className="border-none bg-transparent p-0"
              />

              <div className="divider"></div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <BookOpenIcon className="w-4 h-4" />
                    <span>{parentData.likes?.toString() || 0} 点赞</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShareIcon className="w-4 h-4" />
                    <span>{parentData.forkCount?.toString() || 0} 分叉</span>
                  </div>
                </div>

                <div className="text-xs text-base-content/60">分叉费: {forkFeeEth} ETH</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：分叉表单 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">创建分叉</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4">基本信息</h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">分叉标题 *</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="为你的分叉起个标题..."
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">分叉内容 *</span>
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    className="textarea textarea-bordered w-full h-48"
                    placeholder="继续这个故事..."
                    disabled={isLoading}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt">{formData.content.length} 字符</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4 flex items-center gap-2">
                  <PhotoIcon className="w-5 h-5" />
                  章节插图
                </h3>

                <ImageUploader onImageUpload={handleImageUpload} className="w-full" previewImage={imageUrl} />
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  经济设置
                </h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">我的分叉费用</span>
                    <span className="label-text-alt">ETH</span>
                  </label>
                  <input
                    type="number"
                    name="forkFee"
                    value={formData.forkFee}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="0.01"
                    min="0"
                    step="0.01"
                    disabled={isLoading}
                  />
                  <label className="label">
                    <span className="label-text-alt">其他用户分叉你的内容时需要支付的费用</span>
                  </label>
                </div>

                {parseFloat(forkFeeEth) > 0 && (
                  <div className="alert alert-warning">
                    <InformationCircleIcon className="w-5 h-5" />
                    <div className="text-sm">
                      <div className="font-medium">费用分配:</div>
                      <div>• 你需要支付: {forkFeeEth} ETH</div>
                      <div>• 原故事作者将获得: {(parseFloat(forkFeeEth) * 0.1).toFixed(4)} ETH</div>
                      <div>• 原章节作者将获得: {(parseFloat(forkFeeEth) * 0.85).toFixed(4)} ETH</div>
                      <div>• 平台手续费: {(parseFloat(forkFeeEth) * 0.05).toFixed(4)} ETH</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-outline flex-1"
                disabled={isLoading}
              >
                {t("button.cancel")}
              </button>

              <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={!address || isLoading}>
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    分叉中...
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-4 h-4" />
                    创建分叉
                    {parseFloat(forkFeeEth) > 0 && <span className="text-xs">({forkFeeEth} ETH)</span>}
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

export default ForkStoryPage;
