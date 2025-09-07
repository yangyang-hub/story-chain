"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ChatBubbleLeftIcon, ClockIcon, PaperAirplaneIcon, UserIcon } from "@heroicons/react/24/outline";
import { IPFSContentViewer } from "~~/components/ipfs/IPFSViewer";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useStoryChain } from "~~/hooks/useStoryChain";
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

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentDisplay[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // 获取评论事件
  const { data: commentEvents, refetch: refetchComments } = useScaffoldEventHistory({
    contractName: "StoryChain",
    eventName: "CommentAdded",
    fromBlock: 0n,
    filters: { chapterId: tokenId }, // 注意：合约中事件参数名是 chapterId，但可用于故事和章节
  });

  // 加载评论内容
  useEffect(() => {
    const loadComments = async () => {
      if (!commentEvents || commentEvents.length === 0) {
        setLoadingComments(false);
        return;
      }

      try {
        setLoadingComments(true);

        // 从合约的评论映射获取详细信息
        const commentsWithContent: CommentDisplay[] = [];

        for (let i = 0; i < commentEvents.length; i++) {
          const event = commentEvents[i];

          // 这里需要调用合约的comments映射来获取详细信息
          // 由于合约结构限制，我们使用事件数据
          const comment: CommentDisplay = {
            id: `${event.transactionHash}-${event.logIndex}`,
            commenter: event.args.commenter as string,
            ipfsHash: "", // 需要从合约映射获取
            timestamp: Date.now(), // 需要从区块时间戳获取
          };

          commentsWithContent.push(comment);
        }

        setComments(commentsWithContent);
      } catch (error) {
        console.error("加载评论失败:", error);
      } finally {
        setLoadingComments(false);
      }
    };

    loadComments();
  }, [commentEvents]);

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
      setTimeout(() => {
        refetchComments();
      }, 2000);
    } catch (error) {
      console.error("添加评论失败:", error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <ChatBubbleLeftIcon className="w-5 h-5" />
        <h3 className="text-lg font-semibold">评论 ({comments.length})</h3>
      </div>

      {/* 添加评论表单 */}
      {address ? (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <div className="form-control">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="textarea textarea-bordered w-full h-24 resize-none"
              placeholder={`对这个${tokenType === "story" ? "故事" : "章节"}说点什么...`}
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
                  发布中...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  发布评论
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="alert alert-info">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          <span>请连接钱包后再发表评论</span>
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
                    <p className="text-base-content/90 whitespace-pre-wrap">{comment.content || "评论加载中..."}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/70">还没有评论，来发表第一个评论吧！</p>
          </div>
        )}
      </div>
    </div>
  );
};
