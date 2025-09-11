# 🔗 StoryChain - Claude 项目上下文文档

## 📖 项目概述

StoryChain是一个基于区块链的去中心化故事创作平台，允许用户协作创建分支故事线。每个故事和章节都是独特的NFT，创作者可以通过分叉机制续写他人的故事，并通过经济激励系统获得收益。

## 🏗️ 技术架构

### 核心技术栈
- **区块链**: Ethereum (Solidity ^0.8.19)  
- **智能合约框架**: OpenZeppelin (ERC721, ERC721URIStorage, Ownable, ReentrancyGuard)
- **开发工具**: Foundry (合约开发/测试/部署)
- **前端**: Next.js 15.2.3 + React 19 + TypeScript
- **Web3集成**: Wagmi 2.15.6 + Viem 2.31.1 + RainbowKit 2.2.7
- **样式**: TailwindCSS 4.1.3 + DaisyUI 5.0.9
- **存储**: IPFS (分布式内容存储)
- **状态管理**: Zustand 5.0.0
- **包管理**: Yarn v3.2.3 (Workspaces)

### 项目结构
```
story-chain/
├── packages/
│   ├── foundry/              # 智能合约包
│   │   ├── contracts/        # 合约文件
│   │   │   └── StoryChain.sol # 主合约 (433行)
│   │   ├── script/           # 部署脚本
│   │   ├── test/             # 合约测试
│   │   └── lib/              # 外部依赖 (OpenZeppelin等)
│   └── nextjs/               # 前端应用包
│       ├── app/              # Next.js App Router页面
│       │   ├── story/        # 故事相关页面
│       │   ├── create/       # 创作页面
│       │   ├── profile/      # 用户资料页面
│       │   ├── explore/      # 探索页面
│       │   └── fork/         # 分叉页面
│       ├── components/       # React组件
│       │   ├── ipfs/         # IPFS相关组件
│       │   ├── interactions/ # 社交交互组件
│       │   └── scaffold-eth/ # 基础框架组件
│       ├── contracts/        # 合约ABI和地址
│       ├── hooks/            # 自定义React Hooks
│       └── lib/              # 工具库
├── package.json              # 主包配置
└── README.md                 # 项目文档
```

## 📋 核心业务逻辑

### 智能合约 (StoryChain.sol)
主合约继承自ERC721, ERC721URIStorage, Ownable, ReentrancyGuard，实现以下功能：

#### 数据结构
- **Story**: 故事结构体 (id, author, ipfsHash, likes, forkCount, forkFee等)
- **Chapter**: 章节结构体 (id, parentId, storyId, author, chapterNumber等)  
- **Comment**: 评论结构体 (tokenId, commenter, ipfsHash, timestamp)

#### 核心功能
1. **故事创作**: `createStory()` - 前100个故事免费，之后需质押
2. **章节创作**: `createChapter()` - 故事作者可添加章节
3. **故事分叉**: `forkStory()` - 支付费用分叉现有章节，创建新的故事线
4. **社交功能**: 点赞 (`likeStory/likeChapter`)、评论 (`addComment`)、打赏 (`tip`)
5. **经济系统**: 分叉费用分配、奖励提取 (`withdrawRewards`)

#### 费用分配机制
- 故事作者获得分叉费用的 15%
- 被分叉章节作者获得 85%
- 前100个故事免费创建
- 后续故事需质押，完成指定章节数后返还

### 前端应用

#### 页面路由
- `/` - 首页
- `/story/[id]` - 故事详情页
- `/story/[id]/chapter/[chapterId]` - 章节阅读页
- `/create` - 创建故事页面
- `/fork` - 分叉功能页面
- `/profile` - 用户资料页面
- `/explore` - 故事探索页面

#### 关键组件
- **IPFSUploader/IPFSViewer** - IPFS内容上传和显示
- **LikeButton** - 点赞功能组件
- **CommentSection** - 评论功能组件
- **TipModal** - 打赏功能组件

## 🛠️ 开发工作流

### 常用命令
```bash
# 安装依赖
yarn install

# 启动本地区块链
yarn chain

# 部署智能合约  
yarn deploy

# 启动前端开发服务器
yarn start

# 运行智能合约测试
yarn foundry:test

# 代码格式化
yarn format

# 代码检查
yarn lint
```

### 开发环境要求
- Node.js >= 20.18.3
- Yarn v3.2.3
- Git

## 🔒 安全特性

- **重入攻击防护**: 使用ReentrancyGuard
- **访问控制**: 基于所有权的权限管理  
- **资金安全**: 采用提取模式避免资金锁定
- **合约审计**: 基于OpenZeppelin标准库

## 📚 业务理解要点

### 故事创作流程
1. 用户创建故事 (前100个免费，之后需质押)
2. 故事作者可为故事添加章节
3. 其他用户可支付分叉费用创建分支故事线
4. 所有故事和章节都是NFT，存储在区块链上
5. 内容通过IPFS去中心化存储

### 经济激励模型
- 分叉者支付费用给原创者 (故事作者15% + 章节作者85%)
- 读者可以打赏优质内容
- 质押机制确保内容创作的连续性

### 社交功能
- 点赞系统增加内容可见性
- 评论功能促进社区交流
- 所有社交数据链上存储，去中心化

## 🎯 当前开发状态

根据git状态，当前有以下修改：
- `packages/nextjs/app/story/[id]/chapter/[chapterId]/page.tsx` (已修改)

最近提交记录显示项目在积极开发中：
- "read page" - 章节阅读功能
- "chapter" - 章节相关功能  
- "profile liked" - 用户资料点赞功能
- "story detail" - 故事详情功能
- "add comment" - 评论功能

## 💡 开发提示

1. **智能合约修改**: 需要重新部署并更新前端合约地址
2. **IPFS集成**: 使用Pinata作为IPFS服务提供商
3. **Web3钱包连接**: 通过RainbowKit支持多种钱包
4. **类型安全**: 充分利用TypeScript和Viem的类型安全特性
5. **测试**: 智能合约使用Foundry测试框架
6. **部署**: 支持Vercel部署，包含IPFS构建配置

---

*此文档旨在为Claude提供StoryChain项目的完整上下文，便于理解业务逻辑和技术架构，协助开发任务。*