"use client";

import React, { useState } from "react";

export default function DiagnosticPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const runTest = async (testName: string, url: string, options: any = {}) => {
    setLoading(testName);
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      setResults(prev => ({ ...prev, [testName]: data }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      }));
    } finally {
      setLoading(null);
    }
  };

  const tests = [
    {
      name: "监控状态",
      key: "monitoring",
      action: () => runTest("monitoring", "/api/debug/monitoring?action=status")
    },
    {
      name: "检查数据库表",
      key: "checkTables",
      action: () => runTest("checkTables", "/api/debug/init-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-tables" })
      })
    },
    {
      name: "初始化数据库表",
      key: "initTables",
      action: () => runTest("initTables", "/api/debug/init-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init-tables" })
      })
    },
    {
      name: "数据库连接",
      key: "database",
      action: () => runTest("database", "/api/debug/database")
    },
    {
      name: "启动监控",
      key: "startMonitoring",
      action: () => runTest("startMonitoring", "/api/debug/monitoring?action=start")
    },
    {
      name: "手动同步事件",
      key: "sync",
      action: () => runTest("sync", "/api/debug/monitoring?action=test-comment")
    },
    {
      name: "插入测试评论",
      key: "testComment",
      action: () => runTest("testComment", "/api/debug/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "insert-test-comment",
          tokenId: "1",
          testData: {
            commenter: "0x1234567890123456789012345678901234567890",
            transactionHash: `0xtest${Date.now()}`,
            logIndex: 0
          }
        })
      })
    },
    {
      name: "查询所有评论",
      key: "allComments",
      action: () => runTest("allComments", "/api/debug/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-all-comments" })
      })
    },
    {
      name: "查询TokenId=1的评论",
      key: "tokenComments",
      action: () => runTest("tokenComments", "/api/debug/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-comments", tokenId: "1" })
      })
    },
    {
      name: "清空评论表",
      key: "clearComments",
      action: () => runTest("clearComments", "/api/debug/init-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-comments" })
      })
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">评论系统诊断</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tests.map((test) => (
          <button
            key={test.key}
            onClick={test.action}
            disabled={loading === test.key}
            className={`btn ${loading === test.key ? "loading" : ""} ${
              results[test.key]?.success === true ? "btn-success" : 
              results[test.key]?.success === false ? "btn-error" : "btn-primary"
            }`}
          >
            {loading === test.key ? "测试中..." : test.name}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(results).map(([testKey, result]) => (
          <div key={testKey} className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">
                {tests.find(t => t.key === testKey)?.name}
                <div className={`badge ${
                  result.success === true ? "badge-success" : 
                  result.success === false ? "badge-error" : "badge-neutral"
                }`}>
                  {result.success === true ? "成功" : result.success === false ? "失败" : "未知"}
                </div>
              </h2>
              
              <div className="mockup-code">
                <pre className="text-sm">
                  <code>{JSON.stringify(result, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-base-200 rounded-lg">
        <h3 className="text-lg font-bold mb-4">诊断步骤说明</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>检查数据库表</strong> - 验证comments表是否存在</li>
          <li><strong>初始化数据库表</strong> - 如果表不存在，创建所需的表和索引</li>
          <li><strong>数据库连接</strong> - 测试数据库连接和基本操作</li>
          <li><strong>监控状态</strong> - 检查链上数据监控是否正在运行</li>
          <li><strong>启动监控</strong> - 如果监控未运行，尝试启动它</li>
          <li><strong>插入测试评论</strong> - 手动插入一条测试评论到数据库</li>
          <li><strong>查询评论</strong> - 验证评论是否成功插入</li>
          <li><strong>手动同步事件</strong> - 强制同步链上事件</li>
        </ol>
      </div>

      <div className="mt-8 p-6 bg-info/20 rounded-lg">
        <h3 className="text-lg font-bold mb-4">🔍 问题诊断指南</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-bold">如果评论不显示:</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>首先检查数据库表是否存在 (检查数据库表)</li>
              <li>如果表不存在，点击"初始化数据库表"</li>
              <li>检查监控是否运行 (监控状态)</li>
              <li>如果监控未运行，点击"启动监控"</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold">测试评论插入:</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>点击"插入测试评论"手动添加测试数据</li>
              <li>然后点击"查询所有评论"验证是否成功</li>
              <li>如果成功，说明数据库工作正常</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-warning/20 rounded-lg">
        <h3 className="text-lg font-bold mb-4">⚠️ 常见问题</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>如果监控状态显示未运行，请点击"启动监控"</li>
          <li>如果数据库连接失败，请检查PostgreSQL是否正在运行</li>
          <li>如果评论插入失败，请检查数据库表是否存在</li>
          <li>如果链上事件无法捕获，请检查合约地址配置</li>
        </ul>
      </div>
    </div>
  );
}