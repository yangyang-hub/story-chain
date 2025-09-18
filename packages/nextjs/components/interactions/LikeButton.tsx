"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useStoryChain } from "~~/hooks/useStoryChain";

interface LikeButtonProps {
  tokenId: bigint;
  isStory?: boolean;
  currentLikes: number;
  className?: string;
  showCount?: boolean;
  onLikeSuccess?: () => void;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  tokenId,
  isStory = false,
  currentLikes,
  className = "",
  showCount = true,
  onLikeSuccess,
}) => {
  const { address } = useAccount();
  const { likeStory, likeChapter, isLoading } = useStoryChain();
  const { t } = useLanguage();
  const [likes, setLikes] = useState(currentLikes);

  // 检查用户是否已点赞
  const { data: hasLiked, refetch: refetchLikeStatus } = useScaffoldReadContract({
    contractName: "StoryChain",
    functionName: "hasLiked",
    args: address ? [address, tokenId] : [undefined as unknown as string, undefined as unknown as bigint],
  });

  const handleLike = async () => {
    if (!address) {
      return;
    }

    if (hasLiked) {
      return; // 已经点过赞了
    }

    try {
      if (isStory) {
        await likeStory(tokenId);
      } else {
        await likeChapter(tokenId);
      }

      // 更新本地状态
      setLikes(prev => prev + 1);
      refetchLikeStatus();
      onLikeSuccess?.();
    } catch (error) {
      // 错误处理已在 useStoryChain 中处理
      console.error("Like failed:", error);
    }
  };

  const isDisabled = !address || hasLiked || isLoading;
  const buttonTitle = hasLiked ? t("like.liked") : address ? t("like.like") : t("like.connect_wallet");

  return (
    <button
      onClick={handleLike}
      disabled={isDisabled}
      title={buttonTitle}
      className={`
        flex items-center gap-1 transition-all duration-200
        ${
          hasLiked
            ? "text-error cursor-not-allowed"
            : !address
              ? "text-base-content/40 cursor-not-allowed"
              : "text-base-content/70 hover:text-error hover:scale-110"
        }
        ${isLoading ? "animate-pulse" : ""}
        ${className}
      `}
    >
      {hasLiked ? <HeartIconSolid className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
      {showCount && <span className="text-sm font-medium">{likes}</span>}
    </button>
  );
};
