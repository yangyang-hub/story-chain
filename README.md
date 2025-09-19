# 🔗 StoryChain - 去中心化故事创作平台

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.18.3-brightgreen.svg)
![Yarn](https://img.shields.io/badge/yarn-v3.2.3-blue.svg)
![Solidity](https://img.shields.io/badge/solidity-%5E0.8.19-363636.svg)

</div>

<h4 align="center">
  基于区块链的协作故事创作和NFT平台
</h4>

<p align="center">
  <a href="#-项目简介">项目简介</a> •
  <a href="#-核心功能">核心功能</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-技术架构">技术架构</a> •
  <a href="#-使用指南">使用指南</a> •
  <a href="./README_EN.md">English</a>
</p>

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
  - 原故事作者获得 15%
  - 被分叉章节作者获得 85%
- **打赏系统**: 读者可以为喜欢的故事和章节打赏

### 🎯 社交功能
- **点赞系统**: 用户可以为故事和章节点赞
- **评论功能**: 支持对任意故事或章节添加评论
- **内容存储**: 所有内容通过IPFS去中心化存储

## 🏗️ 技术架构

### 核心技术栈
- **区块链**: Somnia (Solidity ^0.8.19)
- **智能合约框架**: OpenZeppelin (ERC721, ERC721URIStorage, Ownable, ReentrancyGuard)
- **开发工具**: Foundry (合约开发/测试/部署)
- **前端**: Next.js 15.2.3 + React 19 + TypeScript
- **Web3集成**: Wagmi 2.15.6 + Viem 2.31.1 + RainbowKit 2.2.7
- **样式**: TailwindCSS 4.1.3 + DaisyUI 5.0.9
- **存储**: IPFS (分布式内容存储)
- **状态管理**: Zustand 5.0.0
- **包管理**: Yarn v3.2.3 (Workspaces)

### 安全特性
- **重入攻击防护**: 使用ReentrancyGuard
- **访问控制**: 基于所有权的权限管理
- **资金安全**: 采用提取模式避免资金锁定
- **合约审计**: 基于OpenZeppelin标准库

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
  - 原故事作者: 15%
  - 被分叉章节作者: 85%

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

## 🎨 演示

> **注意**: 项目目前处于开发阶段，演示环境即将上线

### 主要页面预览
- 📖 **故事阅读界面**: 优雅的阅读体验，支持章节导航
- ✍️ **创作界面**: 所见即所得的编辑器，支持富文本内容
- 🌿 **分叉界面**: 可视化的故事树，展示分支关系
- 👤 **个人资料**: 创作统计、收益概览、NFT收藏

### 功能特色
- 🎯 **响应式设计**: 完美适配桌面和移动设备
- 🌙 **暗黑模式**: 护眼的夜间阅读体验
- 🔗 **钱包集成**: 支持MetaMask等主流钱包
- 📱 **PWA支持**: 可安装为本地应用

## ❓ 常见问题

<details>
<summary><strong>什么是故事分叉机制？</strong></summary>
<br>
分叉机制允许用户从任意章节创建新的故事线。例如，如果你不喜欢故事的发展方向，可以支付分叉费用从某个章节开始创作属于你的版本。每个分叉都会创建独立的NFT，原作者也会获得分叉费用作为收益。
</details>

<details>
<summary><strong>为什么前100个故事免费？</strong></summary>
<br>
这是为了降低早期用户的参与门槛，鼓励优质内容创作。当平台内容丰富后，后续故事需要质押以确保创作者的承诺和内容质量。
</details>

<details>
<summary><strong>NFT有什么实际价值？</strong></summary>
<br>
每个故事和章节NFT不仅代表创作权益，还能持续获得分叉费用分成。优秀的内容会吸引更多分叉，为创作者带来长期的被动收益。
</details>

<details>
<summary><strong>如何确保内容质量？</strong></summary>
<br>
平台通过经济激励机制自然筛选优质内容：
- 优质内容获得更多点赞和分叉
- 劣质内容难以获得收益
- 社区评论系统提供质量反馈
</details>

## 🔄 开发状态

- ✅ **智能合约**: 核心功能完成，安全审计中
- ✅ **前端界面**: 主要功能界面完成
- 🚧 **IPFS集成**: 优化上传和检索性能
- 🚧 **移动端适配**: 响应式设计完善中
- ⏳ **测试网部署**: 即将发布到测试网
- ⏳ **主网部署**: 计划Q2上线

## 🤝 贡献指南

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献方式
1. 🐛 **报告Bug**: 发现问题请提交Issue
2. 💡 **功能建议**: 提出新功能想法
3. 📝 **代码贡献**: Fork项目并提交PR
4. 📖 **文档完善**: 改进项目文档
5. 🌍 **本地化**: 帮助翻译到更多语言

### 开发规范
- 遵循现有代码风格
- 为新功能编写测试
- 更新相关文档
- 提交前运行 `yarn lint` 和 `yarn test`

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- 📋 **项目计划**: [GitHub Project Board](https://github.com/yourusername/story-chain/projects)
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/yourusername/story-chain/issues)
- 💬 **社区讨论**: [GitHub Discussions](https://github.com/yourusername/story-chain/discussions)
- 📖 **项目文档**: [Documentation](https://docs.storychain.io/) (开发中)
- 🔗 **合约地址**: [Etherscan](https://etherscan.io/) (部署后更新)
- 🌐 **IPFS网关**: [IPFS Gateway](https://ipfs.io/)

## 🙏 致谢

感谢以下开源项目的支持：
- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约库
- [Foundry](https://github.com/foundry-rs/foundry) - 优秀的Solidity开发工具链
- [Next.js](https://nextjs.org/) - React应用框架
- [Wagmi](https://wagmi.sh/) - Web3 React Hooks
- [IPFS](https://ipfs.io/) - 分布式存储网络

---

<div align="center">

**StoryChain** - 让每个故事都有无限可能 ✨

Made with ❤️ by the StoryChain Community

[⭐ Star us on GitHub](https://github.com/yourusername/story-chain) | [🐦 Follow on Twitter](https://twitter.com/storychain_dao)

</div>