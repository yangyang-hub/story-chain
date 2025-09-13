"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAddress, formatDistanceToNow, formatEther, getActivityInfo } from "../utils/formatting";
import MonitorDashboard from "./MonitorDashboard";

interface Story {
  id: string;
  author: string;
  ipfsHash: string;
  createdTime: number;
  likes: number;
  forkCount: number;
  totalTips: string;
  totalTipCount: number;
  blockNumber: number;
  transactionHash: string;
}

interface Chapter {
  id: string;
  storyId: string;
  parentId: string;
  author: string;
  ipfsHash: string;
  createdTime: number;
  likes: number;
  forkCount: number;
  chapterNumber: number;
  totalTips: string;
  totalTipCount: number;
  blockNumber: number;
  transactionHash: string;
}

interface Analytics {
  totalStories: number;
  totalChapters: number;
  totalAuthors: number;
  totalLikes: number;
  totalTips: string;
  mostLikedStoryId?: string;
  mostForkedStoryId?: string;
  topAuthors: Array<{
    address: string;
    storyCount: number;
    chapterCount: number;
    totalEarnings: string;
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: number;
    data: any;
  }>;
}

export default function ChainDataBrowser() {
  const [activeTab, setActiveTab] = useState<"stories" | "chapters" | "analytics" | "monitor">("stories");
  const [stories, setStories] = useState<Story[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 故事筛选参数
  const [storyFilters, setStoryFilters] = useState({
    page: 1,
    limit: 10,
    author: "",
    sortBy: "createdTime",
    sortOrder: "desc",
  });

  // 章节筛选参数
  const [chapterFilters, setChapterFilters] = useState({
    page: 1,
    limit: 10,
    storyId: "",
    author: "",
    parentId: "",
    sortBy: "createdTime",
    sortOrder: "desc",
  });

  // 获取故事数据
  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(storyFilters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/data/stories?${params}`);
      if (!response.ok) throw new Error("Failed to fetch stories");

      const data = await response.json();
      setStories(data.stories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [storyFilters]);

  // 获取章节数据
  const fetchChapters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(chapterFilters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/data/chapters?${params}`);
      if (!response.ok) throw new Error("Failed to fetch chapters");

      const data = await response.json();
      setChapters(data.chapters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [chapterFilters]);

  // 获取分析数据
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "stories") {
      fetchStories();
    } else if (activeTab === "chapters") {
      fetchChapters();
    } else if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab, storyFilters, chapterFilters, fetchStories, fetchChapters]);

  const renderStories = () => (
    <div className="space-y-4">
      {/* 筛选控件 */}
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="作者地址"
            className="input input-bordered"
            value={storyFilters.author}
            onChange={e => setStoryFilters({ ...storyFilters, author: e.target.value, page: 1 })}
          />
          <select
            className="select select-bordered"
            value={storyFilters.sortBy}
            onChange={e => setStoryFilters({ ...storyFilters, sortBy: e.target.value, page: 1 })}
          >
            <option value="createdTime">创建时间</option>
            <option value="likes">点赞数</option>
            <option value="totalTips">打赏总额</option>
            <option value="forkCount">分叉数</option>
          </select>
          <select
            className="select select-bordered"
            value={storyFilters.sortOrder}
            onChange={e => setStoryFilters({ ...storyFilters, sortOrder: e.target.value, page: 1 })}
          >
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
          <button className="btn btn-primary" onClick={fetchStories}>
            刷新
          </button>
        </div>
      </div>

      {/* 故事列表 */}
      {loading ? (
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stories.map(story => (
            <div key={story.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">故事 #{story.id}</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>作者:</strong> <span className="font-mono text-xs">{formatAddress(story.author)}</span>
                  </div>
                  <div>
                    <strong>创建时间:</strong> {new Date(story.createdTime * 1000).toLocaleString()}
                  </div>
                  <div>
                    <strong>IPFS:</strong> <span className="font-mono text-xs">{story.ipfsHash.slice(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>❤️ {story.likes}</span>
                    <span>🍴 {story.forkCount}</span>
                    <span>💰 {formatEther(story.totalTips)} STT</span>
                  </div>
                  <div>
                    <strong>区块:</strong> #{story.blockNumber}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderChapters = () => (
    <div className="space-y-4">
      {/* 筛选控件 */}
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="故事ID"
            className="input input-bordered"
            value={chapterFilters.storyId}
            onChange={e => setChapterFilters({ ...chapterFilters, storyId: e.target.value, page: 1 })}
          />
          <input
            type="text"
            placeholder="父章节ID"
            className="input input-bordered"
            value={chapterFilters.parentId}
            onChange={e => setChapterFilters({ ...chapterFilters, parentId: e.target.value, page: 1 })}
          />
          <input
            type="text"
            placeholder="作者地址"
            className="input input-bordered"
            value={chapterFilters.author}
            onChange={e => setChapterFilters({ ...chapterFilters, author: e.target.value, page: 1 })}
          />
          <select
            className="select select-bordered"
            value={chapterFilters.sortBy}
            onChange={e => setChapterFilters({ ...chapterFilters, sortBy: e.target.value, page: 1 })}
          >
            <option value="createdTime">创建时间</option>
            <option value="likes">点赞数</option>
            <option value="totalTips">打赏总额</option>
            <option value="chapterNumber">章节号</option>
          </select>
          <button className="btn btn-primary" onClick={fetchChapters}>
            刷新
          </button>
        </div>
      </div>

      {/* 章节列表 */}
      {loading ? (
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chapters.map(chapter => (
            <div key={chapter.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">章节 #{chapter.id}</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>故事ID:</strong> {chapter.storyId}
                  </div>
                  <div>
                    <strong>章节号:</strong> {chapter.chapterNumber}
                  </div>
                  <div>
                    <strong>父章节:</strong> {chapter.parentId}
                  </div>
                  <div>
                    <strong>作者:</strong> <span className="font-mono text-xs">{formatAddress(chapter.author)}</span>
                  </div>
                  <div>
                    <strong>创建时间:</strong> {new Date(chapter.createdTime * 1000).toLocaleString()}
                  </div>
                  <div className="flex justify-between">
                    <span>❤️ {chapter.likes}</span>
                    <span>🍴 {chapter.forkCount}</span>
                    <span>💰 {formatEther(chapter.totalTips)} STT</span>
                  </div>
                  <div>
                    <strong>区块:</strong> #{chapter.blockNumber}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <button className="btn btn-primary" onClick={fetchAnalytics}>
        刷新数据
      </button>

      {loading ? (
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 统计卡片 */}
          <div className="stat bg-primary text-primary-content rounded-lg">
            <div className="stat-title text-primary-content/70">总故事数</div>
            <div className="stat-value">{analytics.totalStories}</div>
          </div>

          <div className="stat bg-secondary text-secondary-content rounded-lg">
            <div className="stat-title text-secondary-content/70">总章节数</div>
            <div className="stat-value">{analytics.totalChapters}</div>
          </div>

          <div className="stat bg-accent text-accent-content rounded-lg">
            <div className="stat-title text-accent-content/70">作者数量</div>
            <div className="stat-value">{analytics.totalAuthors}</div>
          </div>

          <div className="stat bg-info text-info-content rounded-lg">
            <div className="stat-title text-info-content/70">总点赞数</div>
            <div className="stat-value">{analytics.totalLikes}</div>
          </div>

          <div className="stat bg-success text-success-content rounded-lg md:col-span-2">
            <div className="stat-title text-success-content/70">总打赏金额</div>
            <div className="stat-value">{formatEther(analytics.totalTips)} STT</div>
          </div>

          {/* 顶级作者 */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-4">顶级作者</h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>地址</th>
                    <th>故事数</th>
                    <th>章节数</th>
                    <th>总收益</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topAuthors.slice(0, 5).map(author => (
                    <tr key={author.address}>
                      <td className="font-mono text-xs">{author.address.slice(0, 8)}...</td>
                      <td>{author.storyCount}</td>
                      <td>{author.chapterCount}</td>
                      <td>{formatEther(author.totalEarnings)} STT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 最近活动 */}
          <div className="md:col-span-4">
            <h3 className="text-lg font-bold mb-4">最近活动</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analytics.recentActivity.slice(0, 20).map((activity, index) => {
                const activityInfo = getActivityInfo(activity.type);
                return (
                  <div key={index} className="alert">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{activityInfo.emoji}</span>
                        <span className={`badge ${activityInfo.color}`}>{activityInfo.name}</span>
                        {activity.data?.storyId && (
                          <span className="text-sm text-base-content/70">故事 #{activity.data.storyId}</span>
                        )}
                      </div>
                      <span className="text-sm text-base-content/70">{formatDistanceToNow(activity.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderMonitor = () => <MonitorDashboard />;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">链上数据浏览器</h1>

        {/* 错误提示 */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
            <button className="btn btn-sm" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

        {/* 标签页 */}
        <div className="tabs tabs-bordered mb-6">
          <button
            className={`tab tab-bordered ${activeTab === "stories" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("stories")}
          >
            故事数据
          </button>
          <button
            className={`tab tab-bordered ${activeTab === "chapters" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("chapters")}
          >
            章节数据
          </button>
          <button
            className={`tab tab-bordered ${activeTab === "analytics" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            数据分析
          </button>
          <button
            className={`tab tab-bordered ${activeTab === "monitor" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("monitor")}
          >
            监控控制
          </button>
        </div>

        {/* 内容区域 */}
        <div>
          {activeTab === "stories" && renderStories()}
          {activeTab === "chapters" && renderChapters()}
          {activeTab === "analytics" && renderAnalytics()}
          {activeTab === "monitor" && renderMonitor()}
        </div>
      </div>
    </div>
  );
}
