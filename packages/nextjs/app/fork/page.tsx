"use client";

import React, { Suspense, useEffect, useState } from "react";
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

const ForkStoryPageContent = () => {
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
    args: storyId ? [BigInt(storyId)] : [undefined as unknown as bigint],
  });

  // 获取原章节信息（如果是分叉章节）
  const { data: originalChapter } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "getChapter",
    args: parentId && parentId !== "0" ? [BigInt(parentId)] : [undefined as unknown as bigint],
  });

  useEffect(() => {
    if (!storyId) {
      notification.error(t("fork.missing_story_id"));
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
        console.error("Load original content failed:", error);
        notification.error(t("error.unknown"));
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
      notification.error(t("error.missing_parameters"));
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
      console.error("Fork failed:", error);
      // 错误处理已在 useStoryChain 中处理
    }
  };

  if (!storyId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <div className="alert alert-error">
          <InformationCircleIcon className="w-6 h-6" />
          <span>{t("fork.missing_story_id")}</span>
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
          <span>{t("fork.original_content_not_found")}</span>
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
        {t("fork.back")}
      </button>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShareIcon className="w-8 h-8" />
          {t("story.fork_story")}
        </h1>
        <p className="text-base-content/70">{isChapterFork ? t("fork.chapter_subtitle") : t("fork.story_subtitle")}</p>
      </div>

      {/* 分叉费用提醒 */}
      {parseFloat(forkFeeEth) > 0 && (
        <div className="alert alert-info mb-6">
          <CurrencyDollarIcon className="w-6 h-6" />
          <div>
            <div className="font-semibold">{t("fork.fee_required_title")}</div>
            <div className="text-sm">
              {t("fork.fee_required_desc", {
                type: isChapterFork ? t("story.chapter") : t("story.title"),
                fee: forkFeeEth,
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：原始内容 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">{isChapterFork ? t("fork.original_chapter") : t("fork.original_story")}</h2>

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
                    <span>
                      {parentData.likes?.toString() || 0} {t("fork.likes")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShareIcon className="w-4 h-4" />
                    <span>
                      {parentData.forkCount?.toString() || 0} {t("fork.forks")}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-base-content/60">
                  {t("fork.fork_fee_label")}: {forkFeeEth} STT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：分叉表单 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">{t("fork.create_fork")}</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4">{t("fork.basic_info")}</h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t("fork.fork_title")}</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder={t("fork.fork_title_placeholder")}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t("fork.fork_content")}</span>
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    className="textarea textarea-bordered w-full h-48"
                    placeholder={t("fork.fork_content_placeholder")}
                    disabled={isLoading}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      {formData.content.length} {t("fork.characters")}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4 flex items-center gap-2">
                  <PhotoIcon className="w-5 h-5" />
                  {t("fork.chapter_illustration")}
                </h3>

                <ImageUploader onImageUpload={handleImageUpload} className="w-full" previewImage={imageUrl} />
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h3 className="card-title mb-4 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  {t("fork.economic_settings")}
                </h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t("fork.my_fork_fee")}</span>
                    <span className="label-text-alt">STT</span>
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
                    <span className="label-text-alt">{t("fork.fork_fee_description")}</span>
                  </label>
                </div>

                {parseFloat(forkFeeEth) > 0 && (
                  <div className="alert alert-warning">
                    <InformationCircleIcon className="w-5 h-5" />
                    <div className="text-sm">
                      <div className="font-medium">{t("fork.fee_distribution")}</div>
                      <div>• {t("fork.you_pay", { fee: forkFeeEth })}</div>
                      <div>• {t("fork.story_author_gets", { amount: (parseFloat(forkFeeEth) * 0.1).toFixed(4) })}</div>
                      <div>
                        • {t("fork.chapter_author_gets", { amount: (parseFloat(forkFeeEth) * 0.85).toFixed(4) })}
                      </div>
                      <div>• {t("fork.platform_fee", { amount: (parseFloat(forkFeeEth) * 0.05).toFixed(4) })}</div>
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
                    {t("fork.forking")}
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-4 h-4" />
                    {t("fork.create_fork_button")}
                    {parseFloat(forkFeeEth) > 0 && <span className="text-xs">({forkFeeEth} STT)</span>}
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

const ForkStoryPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    }>
      <ForkStoryPageContent />
    </Suspense>
  );
};

export default ForkStoryPage;
