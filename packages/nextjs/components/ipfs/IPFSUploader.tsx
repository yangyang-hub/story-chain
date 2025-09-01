"use client";

import React, { useRef, useState } from "react";
import { CloudArrowUpIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "~~/contexts/LanguageContext";
import { getIPFSUrl, uploadImageToIPFS, uploadToIPFS } from "~~/services/ipfs/ipfsService";

interface IPFSUploaderProps {
  onUploadComplete: (cid: string, url: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  acceptedTypes?: string;
  multiple?: boolean;
  maxSize?: number; // 最大文件大小 (bytes)
  className?: string;
}

export const IPFSUploader: React.FC<IPFSUploaderProps> = ({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  acceptedTypes = "image/*,.json,.txt,.md",
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 默认 10MB
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0]; // 目前只处理第一个文件

    // 检查文件大小
    if (file.size > maxSize) {
      const errorMsg = `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`;
      onUploadError?.(errorMsg);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      let cid: string;

      if (file.type.startsWith("image/")) {
        cid = await uploadImageToIPFS(file);
      } else {
        cid = await uploadToIPFS(file);
      }

      const url = getIPFSUrl(cid);
      onUploadComplete(cid, url);
      setUploadProgress(100);

      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("上传失败:", error);
      onUploadError?.(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${dragActive ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary/50"}
          ${isUploading ? "pointer-events-none" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto w-8 h-8">
              <CloudArrowUpIcon className="w-full h-full text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-base-content/70">{t("ipfs.uploading")}</p>
              <div className="w-full bg-base-300 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CloudArrowUpIcon className="w-12 h-12 text-base-content/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-base-content">点击上传或拖拽文件到此处</p>
              <p className="text-xs text-base-content/60 mt-1">支持图片、文本、JSON 等文件类型</p>
              <p className="text-xs text-base-content/40 mt-1">最大文件大小: {Math.round(maxSize / 1024 / 1024)}MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 专门用于上传图片的组件
interface ImageUploaderProps {
  onImageUpload: (cid: string, url: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  className?: string;
  previewImage?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onUploadStart,
  onUploadError,
  className = "",
  previewImage,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];

    // 检查是否为图片
    if (!file.type.startsWith("image/")) {
      onUploadError?.("请选择图片文件");
      return;
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onUploadError?.("图片大小不能超过 5MB");
      return;
    }

    try {
      setIsUploading(true);
      onUploadStart?.();

      const cid = await uploadImageToIPFS(file);
      const url = getIPFSUrl(cid);

      onImageUpload(cid, url);

      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("图片上传失败:", error);
      onUploadError?.(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
          ${dragActive ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary/50"}
          ${isUploading ? "pointer-events-none opacity-50" : ""}
          ${previewImage ? "min-h-32" : "h-32"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={e => e.target.files && handleImageUpload(e.target.files)}
          disabled={isUploading}
        />

        {previewImage ? (
          <div className="relative group">
            <img src={previewImage} alt="预览" className="max-h-64 mx-auto rounded-lg" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <PhotoIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin w-6 h-6">
              <PhotoIcon className="w-full h-full text-primary" />
            </div>
            <p className="text-sm text-base-content/70">{t("ipfs.uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <PhotoIcon className="w-8 h-8 text-base-content/50" />
            <div>
              <p className="text-sm font-medium text-base-content">{t("form.upload_image")}</p>
              <p className="text-xs text-base-content/60">PNG, JPG, GIF (最大 5MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
