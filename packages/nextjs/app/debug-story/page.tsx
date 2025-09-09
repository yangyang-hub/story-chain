"use client";

import { useEffect, useState } from "react";

export default function DebugStoryPage() {
  const [story, setStory] = useState(null);
  const [chapters, setChapters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("开始获取故事数据...");
        
        // 测试故事API
        const storyResponse = await fetch("/api/data/stories/1");
        console.log("故事API响应状态:", storyResponse.status);
        
        if (!storyResponse.ok) {
          throw new Error(`故事API失败: ${storyResponse.status}`);
        }
        
        const storyData = await storyResponse.json();
        console.log("故事数据:", storyData);
        setStory(storyData.story);
        
        // 测试章节API
        const chaptersResponse = await fetch("/api/data/chapters?storyId=1");
        console.log("章节API响应状态:", chaptersResponse.status);
        
        if (!chaptersResponse.ok) {
          throw new Error(`章节API失败: ${chaptersResponse.status}`);
        }
        
        const chaptersData = await chaptersResponse.json();
        console.log("章节数据:", chaptersData);
        setChapters(chaptersData.chapters);
        
      } catch (err) {
        console.error("获取数据失败:", err);
        setError(err instanceof Error ? err.message : "获取数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8">正在加载调试数据...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">错误: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">调试页面</h1>
      
      <div className="mb-8">
        <h2 className="text-xl mb-2">故事数据:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(story, null, 2)}
        </pre>
      </div>
      
      <div>
        <h2 className="text-xl mb-2">章节数据:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(chapters, null, 2)}
        </pre>
      </div>
    </div>
  );
}