# Story Chain 链上数据监控系统

这是一个基于 Next.js 的链上数据监控系统，专为 Story Chain 智能合约设计。系统使用 Vercel Edge Config 存储监控到的链上数据，并提供友好的前端界面进行数据查询和分析。

## ✨ 功能特性

### 📊 实时监控
- **事件监听**: 实时监听智能合约事件（故事创建、章节创建、点赞、打赏等）
- **历史数据同步**: 支持同步历史区块数据
- **自动更新**: 定期检查新数据，防止遗漏事件

### 💾 数据存储
- **Edge Config 集成**: 使用 Vercel Edge Config 存储数据，全球边缘分发
- **结构化数据**: 故事、章节、分析数据分类存储
- **实时更新**: 监控到新事件立即更新存储

### 🔍 数据查询
- **RESTful API**: 提供完整的数据查询 API
- **分页支持**: 支持分页查询大量数据
- **灵活筛选**: 支持按作者、时间、类型等多维度筛选
- **排序功能**: 支持多种排序方式

### 📱 前端界面
- **数据浏览器**: 直观的数据浏览界面
- **监控面板**: 实时监控状态控制
- **数据分析**: 统计分析和可视化展示
- **响应式设计**: 支持移动端和桌面端

## 🏗️ 系统架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   区块链网络     │────│   链上监控器      │────│  Vercel Edge    │
│   (Foundry)     │    │  (ChainMonitor)   │    │     Config      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌────────▼────────┐
                       │   Next.js API   │
                       │     Routes      │
                       └────────┬────────┘
                                │
                       ┌────────▼────────┐
                       │   前端组件       │
                       │ (React + UI)    │
                       └─────────────────┘
```

## 🚀 快速开始

### 1. 环境配置

首先配置环境变量，复制 `.env.local` 文件并填入必要信息：

```bash
# Vercel Edge Config 配置
EDGE_CONFIG="https://edge-config.vercel.com/<config-id>?token=<token>"
EDGE_CONFIG_TOKEN="<your-management-token>"

# 内部API密钥
INTERNAL_API_KEY="your-secure-api-key-here"

# 监控配置
MONITORING_INTERVAL_MS=30000
BLOCKS_RANGE=1000
AUTO_START_MONITOR=false
```

### 2. 设置 Vercel Edge Config

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 在项目设置中创建 Edge Config
3. 复制连接字符串到 `EDGE_CONFIG`
4. 生成管理 Token 并设置到 `EDGE_CONFIG_TOKEN`

### 3. 启动服务

```bash
# 安装依赖
yarn install

# 启动开发服务器
yarn dev
```

### 4. 访问系统

- **主页**: `http://localhost:3000`
- **数据浏览器**: `http://localhost:3000/chain-data`
- **API 文档**: 见下方 API 参考

## 📡 API 参考

### 数据查询 API

#### 获取故事列表
```http
GET /api/data/stories?page=1&limit=10&author=0x123...&sortBy=createdTime&sortOrder=desc
```

#### 获取章节列表
```http
GET /api/data/chapters?storyId=1&page=1&limit=10&sortBy=createdTime
```

#### 获取分析数据
```http
GET /api/data/analytics
```

### 监控控制 API

#### 获取监控状态
```http
GET /api/monitor/control
```

#### 启动/停止监控
```http
POST /api/monitor/control
Content-Type: application/json

{
  "action": "start" // 或 "stop"
}
```

## 💼 使用场景

### 1. 数据分析师
- 查看平台统计数据
- 分析用户行为趋势
- 导出数据进行深度分析

### 2. 开发者
- 监控合约事件
- 调试智能合约
- API 集成开发

### 3. 项目管理者
- 监控平台健康状况
- 查看用户增长数据
- 制定运营策略

## 🔧 核心组件

### ChainMonitor (链上监控器)
- **职责**: 监听区块链事件，处理数据
- **位置**: `lib/monitoring/chainMonitor.ts`
- **特性**: 支持历史数据同步、实时监听、错误恢复

### EdgeConfigStore (数据存储)
- **职责**: 管理 Edge Config 数据存储
- **位置**: `lib/monitoring/edgeConfigStore.ts`  
- **特性**: 类型安全、异步操作、错误处理

### ChainDataBrowser (数据浏览器)
- **职责**: 前端数据展示和交互
- **位置**: `components/ChainDataBrowser.tsx`
- **特性**: 分页查询、实时刷新、响应式设计

### MonitorDashboard (监控面板)
- **职责**: 监控状态控制和展示
- **位置**: `components/MonitorDashboard.tsx`
- **特性**: 实时状态、一键控制、系统信息

## 📊 数据结构

### Story (故事数据)
```typescript
interface StoryData {
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
```

### Chapter (章节数据)
```typescript
interface ChapterData {
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
```

### Analytics (分析数据)
```typescript
interface AnalyticsData {
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
```

## 🛡️ 安全考虑

### API 安全
- 内部 API 使用密钥保护
- 输入验证和错误处理
- 速率限制（建议在生产环境配置）

### 数据隐私
- 不存储敏感信息
- 链上公开数据为主
- 遵循最小权限原则

## 🔍 故障排除

### 常见问题

1. **监控无法启动**
   - 检查 RPC 连接是否正常
   - 验证合约地址和 ABI
   - 查看控制台错误日志

2. **Edge Config 更新失败**
   - 确认 Token 权限正确
   - 检查网络连接
   - 验证数据格式

3. **前端数据不更新**
   - 检查 API 路由状态
   - 确认监控是否运行
   - 刷新浏览器缓存

### 调试技巧

```bash
# 查看监控状态
curl http://localhost:3000/api/monitor/control

# 测试数据 API
curl http://localhost:3000/api/data/stories?limit=1

# 查看控制台日志
yarn dev
```

## 📈 性能优化

### 监控性能
- 调整 `MONITORING_INTERVAL_MS` 减少轮询频率
- 使用 `BLOCKS_RANGE` 限制历史数据范围
- 实现事件去重和缓存

### 存储优化
- Edge Config 有大小限制，注意数据量
- 定期清理过期数据
- 考虑数据压缩

### 前端优化
- 使用分页减少数据传输
- 实现虚拟滚动处理大列表
- 添加加载状态和错误边界

## 🚀 部署指南

### Vercel 部署

1. **推送代码**
   ```bash
   git push origin main
   ```

2. **配置环境变量**
   - 在 Vercel Dashboard 设置所有环境变量
   - 确保 Edge Config 正确配置

3. **部署验证**
   - 检查监控 API 状态
   - 验证数据查询功能
   - 测试前端界面

### 生产环境配置

```bash
# 生产环境变量
NODE_ENV=production
AUTO_START_MONITOR=true
MONITORING_INTERVAL_MS=60000
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

### 代码规范
- 使用 TypeScript 类型注解
- 遵循 ESLint 规则
- 编写单元测试（建议）

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 📞 技术支持

如有问题请提交 Issue 或联系开发团队。

**Happy Monitoring! 🎉**