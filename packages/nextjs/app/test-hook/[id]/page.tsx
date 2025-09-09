"use client";

import { useParams } from "next/navigation";
import { useStoryPageData } from "~~/hooks/useChainData";

export default function TestHookPage() {
  const { id } = useParams();
  const storyId = id as string;

  console.log("测试页面：故事ID为", storyId);
  
  const { story, chapters, loading, error, refetch } = useStoryPageData(storyId);

  console.log("Hook状态:", { story, chapters, loading, error });

  if (loading) {
    return <div className="p-8">Hook加载中... (ID: {storyId})</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-red-500">
        Hook错误: {error}
        <button onClick={refetch} className="btn btn-sm ml-4">重试</button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">测试useStoryPageData Hook</h1>
      <div className="mb-4">
        <strong>故事ID:</strong> {storyId}
      </div>
      <div className="mb-4">
        <strong>故事数据:</strong>
        <pre className="bg-gray-100 p-2 text-sm overflow-auto">
          {JSON.stringify(story, null, 2)}
        </pre>
      </div>
      <div>
        <strong>章节数据:</strong>
        <pre className="bg-gray-100 p-2 text-sm overflow-auto">
          {JSON.stringify(chapters, null, 2)}
        </pre>
      </div>
    </div>
  );
}