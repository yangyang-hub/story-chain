"use client";

import { useCallback, useEffect, useState } from "react";
import { getGlobalMonitor } from "../lib/monitoring";
import { formatAddress } from "../utils/formatting";

interface MonitorStatus {
  isMonitoring: boolean;
  contractAddress: string;
  lastUpdate?: {
    block: number;
    time: string;
  };
}

interface DataStats {
  stories: number;
  chapters: number;
  analytics: number;
}

export default function MonitorDashboard() {
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>({
    isMonitoring: true, // 默认启用
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "Unknown",
  });
  const [dataStats, setDataStats] = useState<DataStats>({ stories: 0, chapters: 0, analytics: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 获取监控状态
  const fetchMonitorStatus = useCallback(async () => {
    try {
      const monitor = getGlobalMonitor();
      if (monitor) {
        const status = await monitor.getStatus();
        setMonitorStatus({
          ...status,
          lastUpdate: status.lastUpdate || undefined,
        });
      } else {
        setMonitorStatus({
          isMonitoring: false,
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "Unknown",
          lastUpdate: undefined,
        });
      }
    } catch (err) {
      console.error("Failed to fetch monitor status:", err);
      setMonitorStatus({
        isMonitoring: false,
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "Unknown",
      });
    }
  }, []);

  // 获取数据统计
  const fetchDataStats = useCallback(async () => {
    try {
      const [storiesRes, chaptersRes, analyticsRes] = await Promise.all([
        fetch("/api/data/stories?limit=1"),
        fetch("/api/data/chapters?limit=1"),
        fetch("/api/data/analytics"),
      ]);

      const stories = storiesRes.ok ? (await storiesRes.json()).pagination?.total || 0 : 0;
      const chapters = chaptersRes.ok ? (await chaptersRes.json()).pagination?.total || 0 : 0;
      const analytics = analyticsRes.ok ? 1 : 0;

      setDataStats({ stories, chapters, analytics });
    } catch (err) {
      console.error("Failed to fetch data stats:", err);
    }
  }, []);

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMonitorStatus(), fetchDataStats()]);
    setLoading(false);
  }, [fetchMonitorStatus, fetchDataStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshAll, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center">
          <h2 className="card-title">监控面板</h2>
          <div className="flex items-center gap-2">
            <label className="label cursor-pointer">
              <span className="label-text mr-2">自动刷新</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
            </label>
            <button className="btn btn-sm btn-primary" onClick={refreshAll} disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm"></span> : "刷新"}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-info">
            <span>{error}</span>
            <button className="btn btn-sm" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

        {/* 监控状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">监控状态</div>
            <div className="stat-value">
              <span className={`badge badge-lg ${monitorStatus?.isMonitoring ? "badge-success" : "badge-error"}`}>
                {monitorStatus?.isMonitoring ? "运行中" : "已停止"}
              </span>
            </div>
            <div className="stat-desc">监控已默认启用，自动同步链上数据</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">合约地址</div>
            <div className="stat-value text-sm font-mono">
              {monitorStatus?.contractAddress ? formatAddress(monitorStatus.contractAddress) : "未知"}
            </div>
            <div className="stat-desc">
              {monitorStatus?.lastUpdate && <>最后更新: 区块 #{monitorStatus.lastUpdate.block}</>}
            </div>
          </div>
        </div>

        {/* 数据统计 */}
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-4">数据统计</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat bg-primary text-primary-content rounded-lg">
              <div className="stat-title text-primary-content/70">故事数据</div>
              <div className="stat-value">{dataStats.stories}</div>
              <div className="stat-desc text-primary-content/60">条记录</div>
            </div>

            <div className="stat bg-secondary text-secondary-content rounded-lg">
              <div className="stat-title text-secondary-content/70">章节数据</div>
              <div className="stat-value">{dataStats.chapters}</div>
              <div className="stat-desc text-secondary-content/60">条记录</div>
            </div>

            <div className="stat bg-accent text-accent-content rounded-lg">
              <div className="stat-title text-accent-content/70">分析数据</div>
              <div className="stat-value">{dataStats.analytics ? "✓" : "✗"}</div>
              <div className="stat-desc text-accent-content/60">{dataStats.analytics ? "已更新" : "未更新"}</div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-4">快速操作</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <a href="/chain-data" className="btn btn-outline">
              浏览数据
            </a>
            <button className="btn btn-outline" onClick={() => window.open("/api/data/stories", "_blank")}>
              故事API
            </button>
            <button className="btn btn-outline" onClick={() => window.open("/api/data/chapters", "_blank")}>
              章节API
            </button>
            <button className="btn btn-outline" onClick={() => window.open("/api/data/analytics", "_blank")}>
              分析API
            </button>
          </div>
        </div>

        {/* 系统信息 */}
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-4">系统信息</h3>
          <div className="bg-base-200 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>监控间隔:</strong> {process.env.NEXT_PUBLIC_MONITORING_INTERVAL_MS || 30000}ms
              </div>
              <div>
                <strong>区块范围:</strong> {process.env.NEXT_PUBLIC_BLOCKS_RANGE || 1000} 块
              </div>
              <div>
                <strong>Edge Config:</strong> {process.env.EDGE_CONFIG ? "已配置" : "未配置"}
              </div>
              <div>
                <strong>环境:</strong> {process.env.NODE_ENV}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
