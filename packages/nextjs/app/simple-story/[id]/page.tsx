"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface StoryData {
  id: string;
  author: string;
  ipfsHash: string;
  createdTime: string;
  likes: number;
  forkCount: number;
  totalTips: string;
  totalTipCount: number;
  blockNumber: string;
  transactionHash: string;
}

export default function SimpleStoryPage() {
  const { id } = useParams();
  const [story, setStory] = useState<StoryData | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("开始获取故事数据...");

        // 获取故事数据
        const storyRes = await fetch(`/api/data/stories/${id}`);
        console.log("故事API响应状态:", storyRes.status);

        if (storyRes.ok) {
          const storyData = await storyRes.json();
          console.log("故事数据:", storyData);
          setStory(storyData.story);
        } else {
          throw new Error(`故事API返回错误: ${storyRes.status}`);
        }

        // 获取章节数据
        const chaptersRes = await fetch(`/api/data/chapters?storyId=${id}`);
        console.log("章节API响应状态:", chaptersRes.status);

        if (chaptersRes.ok) {
          const chaptersData = await chaptersRes.json();
          console.log("章节数据:", chaptersData);
          setChapters(chaptersData.chapters || []);
        }
      } catch (err) {
        console.error("获取数据失败:", err);
        setError(err instanceof Error ? err.message : "获取数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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
        <div className="text-center mt-4">
          <p>正在加载故事数据... (ID: {id})</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <div className="alert alert-error">
          <span>加载失败: {error}</span>
          <button className="btn btn-sm" onClick={() => window.location.reload()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <div className="alert alert-warning">
          <span>故事不存在 (ID: {id})</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">故事详情</h1>

      {/* 故事信息 */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title">故事 #{story.id}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>作者:</strong> {story.author}
            </div>
            <div>
              <strong>创建时间:</strong> {new Date(parseInt(story.createdTime) * 1000).toLocaleString()}
            </div>
            <div>
              <strong>点赞数:</strong> {story.likes}
            </div>
            <div>
              <strong>分叉数:</strong> {story.forkCount}
            </div>
            <div>
              <strong>总打赏:</strong> {story.totalTips} STT
            </div>
            <div>
              <strong>打赏次数:</strong> {story.totalTipCount}
            </div>
          </div>

          <div className="mt-4">
            <strong>IPFS Hash:</strong>
            <code className="ml-2 bg-base-200 px-2 py-1 rounded text-xs">{story.ipfsHash}</code>
          </div>

          <div className="mt-2">
            <strong>区块号:</strong> {story.blockNumber}
          </div>

          <div className="mt-2">
            <strong>交易哈希:</strong>
            <code className="ml-2 bg-base-200 px-2 py-1 rounded text-xs break-all">{story.transactionHash}</code>
          </div>
        </div>
      </div>

      {/* 章节信息 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">章节列表</h3>
          {chapters.length > 0 ? (
            <div className="space-y-2">
              {chapters.map((chapter, index) => (
                <div key={chapter.id} className="border rounded p-3">
                  <strong>章节 #{chapter.id}</strong> - 作者: {chapter.author}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base-content/70">暂无章节</p>
          )}
        </div>
      </div>
    </div>
  );
}
