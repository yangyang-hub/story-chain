"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ChatBubbleLeftIcon, ClockIcon, PaperAirplaneIcon, UserIcon } from "@heroicons/react/24/outline";
import { IPFSContentViewer } from "~~/components/ipfs/IPFSViewer";
import { Address } from "~~/components/scaffold-eth";
import { useStoryChain } from "~~/hooks/useStoryChain";
import { useLanguage } from "~~/contexts/LanguageContext";
import { type CommentMetadata } from "~~/services/ipfs/ipfsService";

interface CommentSectionProps {
  tokenId: bigint;
  tokenType: "story" | "chapter";
  className?: string;
}

interface CommentDisplay {
  id: string;
  commenter: string;
  ipfsHash: string;
  timestamp: number;
  content?: any;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ tokenId, tokenType, className = "" }) => {
  const { address } = useAccount();
  const { addComment, isLoading } = useStoryChain();
  const { t } = useLanguage();

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentDisplay[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // 从API获取评论数据
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await fetch(`/api/data/comments?tokenId=${tokenId.toString()}`);

      if (response.ok) {
        const data = await response.json();
        const fetchedComments: CommentDisplay[] = data.comments.map((comment: any) => ({
          id: comment.id,
          commenter: comment.commenter,
          ipfsHash: comment.ipfsHash,
          timestamp: parseInt(comment.createdTime) * 1000, // 转换为毫秒
        }));
        setComments(fetchedComments);
      } else {
        console.error("Failed to fetch comments:", response.status);
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // 初始加载评论
  useEffect(() => {
    fetchComments();
  }, [tokenId]);

  // 提交评论后重新获取评论列表
  const refetchComments = () => {
    setTimeout(() => {
      fetchComments();
    }, 2000); // 给链上数据一点时间来同步
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    try {
      // 创建评论元数据
      const metadata: CommentMetadata = {
        content: commentText.trim(),
        author: address,
        timestamp: Date.now(),
        storyId: tokenType === "story" ? tokenId.toString() : "0", // TODO: handle chapter case properly
        tokenId: tokenId.toString(),
      };

      // 调用合约添加评论
      await addComment(tokenId, metadata);

      // 清空输入框
      setCommentText("");

      // 刷新评论列表
      refetchComments();
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <ChatBubbleLeftIcon className="w-5 h-5" />
        <h3 className="text-lg font-semibold">{t("comment.title")} ({comments.length})</h3>
      </div>

      {/* 添加评论表单 */}
      {address ? (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <div className="form-control">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="textarea textarea-bordered w-full h-24 resize-none"
              placeholder={t(tokenType === "story" ? "comment.placeholder_story" : "comment.placeholder_chapter")}
              disabled={isLoading}
              maxLength={500}
            />
            <label className="label">
              <span className="label-text-alt">{commentText.length}/500</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={!commentText.trim() || isLoading}>
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {t("comment.adding")}
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {t("comment.add")}
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="alert alert-info">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          <span>{t("comment.connect_wallet")}</span>
        </div>
      )}

      <div className="divider"></div>

      {/* 评论列表 */}
      <div className="space-y-4">
        {loadingComments ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-base-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-base-300 rounded w-1/4"></div>
                    <div className="h-16 bg-base-300 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                {/* 评论头部信息 */}
                <div className="flex items-center gap-2 text-sm text-base-content/70 mb-2">
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <Address address={comment.commenter} size="sm" />
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>{new Date(comment.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* 评论内容 */}
                <div className="prose prose-sm max-w-none">
                  {comment.ipfsHash ? (
                    <IPFSContentViewer
                      cid={comment.ipfsHash}
                      contentType="json"
                      className="bg-transparent border-none p-0"
                    />
                  ) : (
                    <div className="text-base-content/60 italic">{t("comment.loading")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/70">{t("comment.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
