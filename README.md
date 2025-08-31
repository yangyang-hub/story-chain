# 🔗 StoryChain - 去中心化故事创作平台

<h4 align="center">
  基于区块链的协作故事创作和NFT平台
</h4>

## 📖 项目简介

StoryChain是一个创新的去中心化故事创作平台，允许用户协作创建分支故事线。每个故事和章节都是独特的NFT，创作者可以通过分叉机制续写他人的故事，并通过经济激励系统获得收益。

## ✨ 核心功能

### 📚 故事创作系统
- **故事创建**: 用户可以创建原创故事，成为故事的所有者
- **章节续写**: 故事作者可以为自己的故事添加新章节
- **分叉机制**: 任何用户都可以支付费用分叉现有章节，创建不同的故事线
- **NFT铸造**: 每个故事和章节都会铸造为独特的NFT

### 💰 经济激励模型
- **分叉费用**: 分叉者需要支付费用，资金分配给原作者
  - 故事作者获得 10%
  - 章节作者获得 89%  
  - 平台收取 1% 手续费
- **打赏系统**: 读者可以为喜欢的故事和章节打赏
- **质押机制**: 前100个故事免费创建，之后需要质押10 ETH（完成100章后返还）

### 🎯 社交功能
- **点赞系统**: 用户可以为故事和章节点赞
- **评论功能**: 支持对任意故事或章节添加评论
- **内容存储**: 所有内容通过IPFS去中心化存储

## 🏗️ 技术架构

- **智能合约**: Solidity ^0.8.19
- **标准遵循**: ERC721 (NFT), ERC721URIStorage
- **安全性**: OpenZeppelin合约库，ReentrancyGuard防重入
- **存储**: IPFS分布式存储
- **前端**: Next.js + TypeScript
- **区块链交互**: Wagmi + Viem + RainbowKit

## 📋 合约功能详解

### 核心数据结构

#### Story (故事)
```solidity
struct Story {
    uint256 id;              // 故事ID (NFT Token ID)
    address author;          // 故事作者
    string ipfsHash;         // IPFS存储哈希
    uint256 createdTime;     // 创建时间
    uint256 likes;           // 点赞数
    uint256 forkCount;       // 分叉数
    uint256 forkFee;         // 分叉费用
    bool isDeposited;        // 是否已质押
    uint256 deposited;       // 质押金额
    uint256 totalTips;       // 总打赏
    uint256 totalTipCount;   // 打赏次数
    uint256 totalForkFees;   // 总分叉收入
    uint256 firstChapterId;  // 首章节ID
}
```

#### Chapter (章节)
```solidity
struct Chapter {
    uint256 id;                    // 章节ID (NFT Token ID)
    uint256 parentId;              // 父章节ID
    uint256 storyId;               // 所属故事ID
    address author;                // 章节作者
    string ipfsHash;               // IPFS存储哈希
    uint256 createdTime;           // 创建时间
    uint256 likes;                 // 点赞数
    uint256 forkCount;             // 分叉数
    uint256 forkFee;               // 分叉费用
    uint256 totalForkFees;         // 分叉收入
    uint256 totalTips;             // 打赏收入
    uint256 totalTipCount;         // 打赏次数
    uint256 chapterNumber;         // 章节序号
    uint256[] childChapterIds;     // 子章节列表
}
```

### 主要功能函数

#### 创作相关
- `createStory(string ipfsHash, uint256 forkFee)` - 创建新故事
- `createChapter(uint256 storyId, uint256 parentId, string ipfsHash, uint256 forkFee)` - 创建章节
- `forkStory(uint256 storyId, uint256 parentId, string ipfsHash, uint256 forkFee)` - 分叉故事

#### 社交功能
- `likeStory(uint256 storyId)` - 为故事点赞
- `likeChapter(uint256 chapterId)` - 为章节点赞
- `addComment(uint256 tokenId, string ipfsHash)` - 添加评论
- `tip(uint256 storyId, uint256 chapterId)` - 打赏

#### 经济功能
- `withdrawRewards()` - 提取奖励
- `updateStoryForkFee(uint256 storyId, uint256 newForkFee)` - 更新故事分叉费用
- `updateChapterForkFee(uint256 chapterId, uint256 newForkFee)` - 更新章节分叉费用

## 🚀 快速开始

### 环境要求

- [Node.js (>= v20.18.3)](https://nodejs.org/en/download/)
- [Yarn](https://yarnpkg.com/getting-started/install)
- [Git](https://git-scm.com/downloads)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd story-chain
```

2. **安装依赖**
```bash
yarn install
```

3. **启动本地区块链**
```bash
yarn chain
```

4. **部署智能合约**
```bash
yarn deploy
```

5. **启动前端应用**
```bash
yarn start
```

访问 `http://localhost:3000` 查看应用

### 测试
```bash
# 运行智能合约测试
yarn foundry:test
```

## 📁 项目结构

```
story-chain/
├── packages/
│   ├── foundry/                 # 智能合约
│   │   ├── contracts/          # 合约文件
│   │   │   └── StoryChain.sol  # 主合约
│   │   ├── script/             # 部署脚本
│   │   └── test/               # 合约测试
│   └── nextjs/                 # 前端应用
│       ├── app/                # Next.js页面
│       ├── components/         # 组件库
│       └── services/           # 服务层
├── README.md
└── package.json
```

## 🎮 使用指南

### 创建故事
1. 连接钱包
2. 前100个故事免费创建，之后需质押10 ETH
3. 上传故事内容到IPFS
4. 设置分叉费用
5. 确认交易创建故事NFT

### 续写章节
1. 作为故事所有者，可以添加新章节
2. 其他用户可以通过支付分叉费用来创建分支故事线
3. 每个章节都是独立的NFT

### 经济激励
1. **分叉收益**: 当有人分叉你的内容时获得收益
2. **打赏收益**: 读者可以直接打赏优质内容
3. **质押返还**: 故事作者完成100章后可取回质押金

## 🎯 平台经济学

### 费用分配机制
- **分叉费用分配**:
  - 原故事作者: 10%
  - 被分叉章节作者: 89%
  - 平台手续费: 1%

### 质押机制
- 前100个故事: 免费创建
- 后续故事: 需质押10 ETH
- 完成100章节后: 自动返还质押金

### 激励机制
- 优质内容获得更多分叉和打赏
- 分叉费用为创作者提供持续收益
- 社交功能促进社区互动

## 🛡️ 安全特性

- **重入攻击防护**: 使用ReentrancyGuard
- **访问控制**: 基于所有权的权限管理
- **资金安全**: 采用提取模式避免资金锁定
- **合约审计**: 基于OpenZeppelin标准库

## 🤝 贡献指南

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [StoryChain合约地址](https://etherscan.io/) (部署后更新)
- [IPFS网关](https://ipfs.io/)
- [项目文档](https://docs.storychain.io/) (开发中)

---

**StoryChain** - 让每个故事都有无限可能 ✨