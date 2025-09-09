# 链上数据查询系统使用指南

## 概览

前端工程现在使用 PostgreSQL 数据库查询链上数据，并提供自动数据同步机制。当进行链上操作时，系统会自动触发链上数据查询，确保 PostgreSQL 中的数据及时更新。

## 系统架构

```
前端组件 ← React Hooks ← ChainDataService ← API 路由 ← PostgreSQL ← ChainMonitor ← 区块链
```

## 主要功能

1. **自动链上数据监控**: 通过 `ChainMonitor` 实时监控区块链事件
2. **PostgreSQL 数据存储**: 将链上数据同步到 PostgreSQL 数据库
3. **统一的数据查询服务**: 提供缓存、错误处理等功能
4. **React Hooks**: 便于前端组件使用的数据获取接口
5. **手动数据同步**: 链上操作后可手动触发数据更新

## 快速开始

### 1. 环境配置

确保 `.env.local` 文件包含以下配置：

```bash
# PostgreSQL 配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=story_chain
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# 自动启动监控
AUTO_START_MONITOR=true

# API 密钥
INTERNAL_API_KEY="your-secure-api-key"
NEXT_PUBLIC_INTERNAL_API_KEY="your-secure-api-key"
```

### 2. 在组件中使用 Hooks

#### 获取故事列表

```tsx
import { useStories } from "~/hooks/useChainData";

function StoriesPage() {
  const { data, loading, error, refetch } = useStories({
    page: 1,
    limit: 10,
    sortBy: "createdTime",
    sortOrder: "desc",
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.data.map(story => (
        <div key={story.id}>
          <h3>Story {story.id}</h3>
          <p>Author: {story.author}</p>
          <p>Likes: {story.likes}</p>
        </div>
      ))}
    </div>
  );
}
```

#### 获取单个故事

```tsx
import { useChaptersByStory, useStoryById } from "~/hooks/useChainData";

function StoryDetailPage({ storyId }: { storyId: string }) {
  const { data: story, loading: storyLoading } = useStoryById(storyId);
  const { data: chapters, loading: chaptersLoading } = useChaptersByStory(storyId);

  const loading = storyLoading || chaptersLoading;

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Story: {story?.id}</h1>
      <p>Author: {story?.author}</p>
      <h2>Chapters ({chapters?.data.length})</h2>
      {chapters?.data.map(chapter => (
        <div key={chapter.id}>
          <p>
            Chapter {chapter.chapterNumber}: {chapter.id}
          </p>
        </div>
      ))}
    </div>
  );
}
```

#### 获取分析数据

```tsx
import { useAnalytics } from "~/hooks/useChainData";

function AnalyticsPage() {
  const { data: analytics, loading } = useAnalytics();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Analytics</h2>
      <p>Total Stories: {analytics?.totalStories}</p>
      <p>Total Chapters: {analytics?.totalChapters}</p>
      <p>Total Authors: {analytics?.totalAuthors}</p>
      <p>Total Likes: {analytics?.totalLikes}</p>
    </div>
  );
}
```

### 3. 链上操作后触发数据同步

```tsx
import { useDataSync } from "~/hooks/useChainData";

function CreateStoryForm() {
  const { triggerSync, syncing } = useDataSync();

  const handleSubmit = async formData => {
    try {
      // 执行链上交易
      const tx = await writeContract({
        /* ... */
      });
      await waitForTransactionReceipt({ hash: tx });

      // 手动触发数据同步
      await triggerSync();

      // 重新获取数据
      refetch();
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
      <button disabled={syncing}>{syncing ? "Syncing..." : "Create Story"}</button>
    </form>
  );
}
```

### 4. 页面级数据获取

使用组合 Hook 获取页面所需的所有数据：

```tsx
import { useStoryPageData } from "~/hooks/useChainData";

function StoryPage({ storyId }: { storyId: string }) {
  const { story, chapters, pagination, loading, error, refetch } = useStoryPageData(storyId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{story?.id}</h1>
      <p>Chapters: {chapters.length}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### 5. 缓存管理

```tsx
import { useCacheManagement } from "~/hooks/useChainData";

function AdminPanel() {
  const { clearCache, clearCacheByPattern, preloadData } = useCacheManagement();

  return (
    <div>
      <button onClick={clearCache}>Clear All Cache</button>
      <button onClick={() => clearCacheByPattern("stories")}>Clear Stories Cache</button>
      <button onClick={preloadData}>Preload Data</button>
    </div>
  );
}
```

## API 端点

系统提供以下 REST API 端点：

- `GET /api/data/stories` - 获取故事列表（支持分页、过滤、排序）
- `GET /api/data/stories/[id]` - 获取单个故事
- `GET /api/data/chapters` - 获取章节列表（支持分页、过滤、排序）
- `GET /api/data/chapters/[id]` - 获取单个章节
- `GET /api/data/analytics` - 获取分析数据
- `POST /api/data/sync` - 手动触发数据同步
- `GET /api/data/sync` - 获取监控状态

## 数据同步机制

1. **自动监控**: 应用启动时自动开始监控链上事件
2. **实时同步**: 监听到新事件时立即同步数据
3. **定期检查**: 每30秒检查一次是否有遗漏的事件
4. **手动触发**: 可通过 API 或 Hook 手动触发同步

## 性能优化

1. **缓存机制**: 数据服务包含30秒的内存缓存
2. **分页查询**: 支持分页减少数据传输量
3. **按需加载**: Hook 支持延迟加载和依赖更新
4. **预加载**: 系统启动时自动预加载常用数据

## 错误处理

- 所有 Hook 都包含 `error` 状态
- 网络错误会自动重试
- 404 错误会返回 `null` 而不是抛出异常
- 数据库连接错误会有适当的错误信息

## 监控和调试

- 查看浏览器控制台的同步日志
- 使用 `useMonitorStatus` Hook 检查监控状态
- 通过 `/api/data/sync` 端点查看同步状态

## 注意事项

1. 确保 PostgreSQL 数据库已正确配置和运行
2. 在生产环境中使用安全的 API 密钥
3. 监控数据库连接池和性能
4. 定期清理旧的分析数据以保持性能

## 故障排除

### 数据不同步

1. 检查 `AUTO_START_MONITOR` 环境变量
2. 查看应用启动日志
3. 手动调用 `/api/data/sync` API

### 数据库连接错误

1. 检查数据库配置
2. 确认数据库服务正在运行
3. 验证连接参数和权限

### 缓存问题

1. 使用 `clearCache()` 清除缓存
2. 检查缓存超时设置
3. 重启应用清除所有缓存
