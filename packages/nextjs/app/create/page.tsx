"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { InformationCircleIcon, PhotoIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ImageUploader } from "~~/components/ipfs/IPFSUploader";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import chainDataService from "~~/services/chain/chainDataService";
import { type StoryMetadata, uploadStoryMetadata } from "~~/services/ipfs/ipfsService";
import { notification } from "~~/utils/scaffold-eth";

const CreateStoryPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    title: "",
    tags: "",
    description: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCid, setImageCid] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create story contract call
  const { writeContractAsync: createStory } = useScaffoldWriteContract("StoryChain");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (cid: string, url: string) => {
    setImageCid(cid);
    setImageUrl(url);
    setIsUploading(false);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      notification.error(t("form.title.required"));
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

    try {
      setIsCreating(true);

      // Create story metadata
      const metadata: StoryMetadata = {
        title: formData.title,
        content: "", // Stories don't have content, only chapters do
        author: address,
        timestamp: Date.now(),
        tags: formData.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        image: imageCid,
        description: formData.description || formData.title,
      };

      // Upload to IPFS
      const ipfsHash = await uploadStoryMetadata(metadata);

      // Call contract to create story (fork fee fixed to 0 STT)
      await createStory({
        functionName: "createStory",
        args: [ipfsHash, parseEther("0")], // Fixed to 0 STT
      });

      // Clear stories cache to ensure new story appears on explore page
      chainDataService.clearCacheByPattern("stories");

      notification.success(t("success.story_created"));
      router.push("/explore");
    } catch (error) {
      console.error("Story creation failed:", error);
      notification.error(error instanceof Error ? error.message : t("error.unknown"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("story.create")}</h1>
        <p className="text-base-content/70">{t("create.subtitle")}</p>
      </div>

      {!address && (
        <div className="alert alert-warning mb-6">
          <InformationCircleIcon className="w-6 h-6" />
          <span>{t("create.connect_wallet")}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">{t("create.basic_info")}</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("story.title")} *</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder={t("create.title_placeholder")}
                disabled={isCreating}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("create.story_description")}</span>
                <span className="label-text-alt">{t("create.description_optional")}</span>
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder={t("create.description_placeholder")}
                disabled={isCreating}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">{t("create.tags")}</span>
                <span className="label-text-alt">{t("create.tags_separator")}</span>
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder={t("create.tags_placeholder")}
                disabled={isCreating}
              />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4 flex items-center gap-2">
              <PhotoIcon className="w-5 h-5" />
              {t("create.story_cover")}
            </h2>

            <ImageUploader
              onImageUpload={handleImageUpload}
              onUploadStart={() => setIsUploading(true)}
              onUploadError={error => {
                setIsUploading(false);
                notification.error(error);
              }}
              className="w-full"
              previewImage={imageUrl}
            />

            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <span className="loading loading-spinner loading-sm"></span>
                {t("ipfs.uploading")}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => router.back()} className="btn btn-outline flex-1" disabled={isCreating}>
            {t("button.cancel")}
          </button>

          <button
            type="submit"
            className="btn btn-primary flex-1 gap-2"
            disabled={!address || isCreating || isUploading}
          >
            {isCreating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {t("create.creating")}
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                {t("story.create_story")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateStoryPage;
