# 🔗 StoryChain - Decentralized Story Creation Platform

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.18.3-brightgreen.svg)
![Yarn](https://img.shields.io/badge/yarn-v3.2.3-blue.svg)
![Solidity](https://img.shields.io/badge/solidity-%5E0.8.19-363636.svg)

</div>

<h4 align="center">
  Blockchain-based Collaborative Story Creation and NFT Platform
</h4>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-core-features">Core Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-tech-architecture">Tech Architecture</a> •
  <a href="#-usage-guide">Usage Guide</a> •
  <a href="./README.md">中文</a>
</p>

## 📖 Overview

StoryChain is an innovative decentralized story creation platform that enables users to collaboratively create branching storylines. Each story and chapter is a unique NFT, allowing creators to continue others' stories through a forking mechanism while earning rewards through an economic incentive system.

## ✨ Core Features

### 📚 Story Creation System
- **Story Creation**: Users can create original stories and become the story owner
- **Chapter Continuation**: Story authors can add new chapters to their stories
- **Forking Mechanism**: Any user can pay a forking fee to create different storylines from existing chapters
- **NFT Minting**: Each story and chapter is minted as a unique NFT

### 💰 Economic Incentive Model
- **Forking Fees**: Forkers need to pay fees, with funds distributed to original authors
  - Original story author receives 15%
  - Forked chapter author receives 85%
- **Tipping System**: Readers can tip their favorite stories and chapters

### 🎯 Social Features
- **Like System**: Users can like stories and chapters
- **Comment Feature**: Support for adding comments to any story or chapter
- **Content Storage**: All content stored decentralized through IPFS

## 🏗️ Tech Architecture

### Core Tech Stack
- **Blockchain**: Somnia (Solidity ^0.8.19)
- **Smart Contract Framework**: OpenZeppelin (ERC721, ERC721URIStorage, Ownable, ReentrancyGuard)
- **Development Tools**: Foundry (contract development/testing/deployment)
- **Frontend**: Next.js 15.2.3 + React 19 + TypeScript
- **Web3 Integration**: Wagmi 2.15.6 + Viem 2.31.1 + RainbowKit 2.2.7
- **Styling**: TailwindCSS 4.1.3 + DaisyUI 5.0.9
- **Storage**: IPFS (distributed content storage)
- **State Management**: Zustand 5.0.0
- **Package Manager**: Yarn v3.2.3 (Workspaces)

### Security Features
- **Reentrancy Protection**: Using ReentrancyGuard
- **Access Control**: Ownership-based permission management
- **Fund Security**: Withdrawal pattern to avoid fund locking
- **Contract Audit**: Based on OpenZeppelin standard library

## 📋 Contract Function Details

### Core Data Structures

#### Story
```solidity
struct Story {
    uint256 id;              // Story ID (NFT Token ID)
    address author;          // Story author
    string ipfsHash;         // IPFS storage hash
    uint256 createdTime;     // Creation time
    uint256 likes;           // Like count
    uint256 forkCount;       // Fork count
    uint256 forkFee;         // Fork fee
    bool isDeposited;        // Whether deposited
    uint256 deposited;       // Deposit amount
    uint256 totalTips;       // Total tips
    uint256 totalTipCount;   // Tip count
    uint256 totalForkFees;   // Total fork income
    uint256 firstChapterId;  // First chapter ID
}
```

#### Chapter
```solidity
struct Chapter {
    uint256 id;                    // Chapter ID (NFT Token ID)
    uint256 parentId;              // Parent chapter ID
    uint256 storyId;               // Story ID
    address author;                // Chapter author
    string ipfsHash;               // IPFS storage hash
    uint256 createdTime;           // Creation time
    uint256 likes;                 // Like count
    uint256 forkCount;             // Fork count
    uint256 forkFee;               // Fork fee
    uint256 totalForkFees;         // Fork income
    uint256 totalTips;             // Tip income
    uint256 totalTipCount;         // Tip count
    uint256 chapterNumber;         // Chapter number
    uint256[] childChapterIds;     // Child chapter list
}
```

### Main Functions

#### Creation Related
- `createStory(string ipfsHash, uint256 forkFee)` - Create new story
- `createChapter(uint256 storyId, uint256 parentId, string ipfsHash, uint256 forkFee)` - Create chapter
- `forkStory(uint256 storyId, uint256 parentId, string ipfsHash, uint256 forkFee)` - Fork story

#### Social Features
- `likeStory(uint256 storyId)` - Like story
- `likeChapter(uint256 chapterId)` - Like chapter
- `addComment(uint256 tokenId, string ipfsHash)` - Add comment
- `tip(uint256 storyId, uint256 chapterId)` - Tip

#### Economic Functions
- `withdrawRewards()` - Withdraw rewards
- `updateStoryForkFee(uint256 storyId, uint256 newForkFee)` - Update story fork fee
- `updateChapterForkFee(uint256 chapterId, uint256 newForkFee)` - Update chapter fork fee

## 🚀 Quick Start

### Requirements

- [Node.js (>= v20.18.3)](https://nodejs.org/en/download/)
- [Yarn](https://yarnpkg.com/getting-started/install)
- [Git](https://git-scm.com/downloads)

### Installation

1. **Clone Repository**
```bash
git clone <repository-url>
cd story-chain
```

2. **Install Dependencies**
```bash
yarn install
```

3. **Start Local Blockchain**
```bash
yarn chain
```

4. **Deploy Smart Contracts**
```bash
yarn deploy
```

5. **Start Frontend Application**
```bash
yarn start
```

Visit `http://localhost:3000` to view the application

### Testing
```bash
# Run smart contract tests
yarn foundry:test
```

## 📁 Project Structure

```
story-chain/
├── packages/
│   ├── foundry/                 # Smart contracts
│   │   ├── contracts/          # Contract files
│   │   │   └── StoryChain.sol  # Main contract
│   │   ├── script/             # Deploy scripts
│   │   └── test/               # Contract tests
│   └── nextjs/                 # Frontend application
│       ├── app/                # Next.js pages
│       ├── components/         # Component library
│       └── services/           # Service layer
├── README.md
└── package.json
```

## 🎮 Usage Guide

### Creating Stories
1. Connect wallet
2. First 100 stories are free, subsequent ones require 10 ETH deposit
3. Upload story content to IPFS
4. Set fork fee
5. Confirm transaction to create story NFT

### Writing Chapters
1. As story owner, you can add new chapters
2. Other users can create branch storylines by paying fork fees
3. Each chapter is an independent NFT

### Economic Incentives
1. **Fork Revenue**: Earn when someone forks your content
2. **Tip Revenue**: Readers can directly tip quality content
3. **Deposit Return**: Story authors can withdraw deposit after completing 100 chapters

## 🎯 Platform Economics

### Fee Distribution Mechanism
- **Fork Fee Distribution**:
  - Original story author: 15%
  - Forked chapter author: 85%

### Deposit Mechanism
- First 100 stories: Free creation
- Subsequent stories: Require 10 ETH deposit
- After completing 100 chapters: Automatic deposit return

### Incentive Mechanism
- Quality content gets more forks and tips
- Fork fees provide continuous revenue for creators
- Social features promote community interaction

## 🛡️ Security Features

- **Reentrancy Protection**: Using ReentrancyGuard
- **Access Control**: Ownership-based permission management
- **Fund Security**: Withdrawal pattern to avoid fund locking
- **Contract Audit**: Based on OpenZeppelin standard library

## 🎨 Demo

> **Note**: Project is currently in development, demo environment coming soon

### Main Page Preview

- 📖 **Story Reading Interface**: Elegant reading experience with chapter navigation
- ✍️ **Creation Interface**: WYSIWYG editor with rich text content support
- 🌿 **Fork Interface**: Visual story tree showing branch relationships
- 👤 **Profile**: Creation statistics, revenue overview, NFT collections

### Feature Highlights

- 🎯 **Responsive Design**: Perfect adaptation for desktop and mobile devices
- 🌙 **Dark Mode**: Eye-friendly night reading experience
- 🔗 **Wallet Integration**: Support for MetaMask and other mainstream wallets
- 📱 **PWA Support**: Installable as local application

## ❓ FAQ

<details>
<summary><strong>What is the story forking mechanism?</strong></summary>
<br>
The forking mechanism allows users to create new storylines from any chapter. For example, if you don't like the story's direction, you can pay a fork fee to start creating your own version from a certain chapter. Each fork creates independent NFTs, and original authors also receive fork fees as revenue.
</details>

<details>
<summary><strong>Why are the first 100 stories free?</strong></summary>
<br>
This is to lower the participation threshold for early users and encourage quality content creation. When the platform has rich content, subsequent stories require deposits to ensure creator commitment and content quality.
</details>

<details>
<summary><strong>What is the actual value of NFTs?</strong></summary>
<br>
Each story and chapter NFT not only represents creation rights but also continuously receives fork fee shares. Excellent content will attract more forks, bringing creators long-term passive income.
</details>

<details>
<summary><strong>How to ensure content quality?</strong></summary>
<br>
The platform naturally filters quality content through economic incentive mechanisms:
- Quality content gets more likes and forks
- Poor content struggles to earn revenue
- Community comment system provides quality feedback
</details>

## 🔄 Development Status

- ✅ **Smart Contracts**: Core functions complete, security audit in progress
- ✅ **Frontend Interface**: Main functional interfaces complete
- 🚧 **IPFS Integration**: Optimizing upload and retrieval performance
- 🚧 **Mobile Adaptation**: Responsive design refinement in progress
- ⏳ **Testnet Deployment**: Will be released to testnet soon
- ⏳ **Mainnet Deployment**: Planned for Q2 launch

## 🤝 Contributing

We welcome community contributions! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### How to Contribute

1. 🐛 **Report Bugs**: Submit issues for problems found
2. 💡 **Feature Suggestions**: Propose new feature ideas
3. 📝 **Code Contributions**: Fork project and submit PRs
4. 📖 **Documentation Improvement**: Improve project documentation
5. 🌍 **Localization**: Help translate to more languages

### Development Standards

- Follow existing code style
- Write tests for new features
- Update relevant documentation
- Run `yarn lint` and `yarn test` before submission

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- 🚀 **Live Demo**: [https://story-chain-chi.vercel.app/](https://story-chain-chi.vercel.app/)
- 📋 **Project Planning**: [GitHub Project Board](https://github.com/yourusername/story-chain/projects)
- 🐛 **Issue Reports**: [GitHub Issues](https://github.com/yourusername/story-chain/issues)
- 💬 **Community Discussion**: [GitHub Discussions](https://github.com/yourusername/story-chain/discussions)
- 📖 **Project Documentation**: [Documentation](https://docs.storychain.io/) (in development)
- 🔗 **Contract Addresses**:
  - **Local Development Network (Chain ID: 31337)**: [`0x700b6a60ce7eaaea56f065753d8dcb9653dbad35`](http://localhost:8545)
  - **Somnia Network (Chain ID: 50312)**: [`0xFaFb27232e704f3BFe272c2FBb6a28f54f8C0653`](https://explorer.somnia.network/address/0xFaFb27232e704f3BFe272c2FBb6a28f54f8C0653)
- 🌐 **IPFS Gateway**: [IPFS Gateway](https://ipfs.io/)

## 🙏 Acknowledgments

Thanks to the following open source projects for their support:
- [OpenZeppelin](https://openzeppelin.com/) - Secure smart contract library
- [Foundry](https://github.com/foundry-rs/foundry) - Excellent Solidity development toolchain
- [Next.js](https://nextjs.org/) - React application framework
- [Wagmi](https://wagmi.sh/) - Web3 React Hooks
- [IPFS](https://ipfs.io/) - Distributed storage network

---

<div align="center">

**StoryChain** - Every Story Has Infinite Possibilities ✨

Made with ❤️ by the StoryChain Community

[⭐ Star us on GitHub](https://github.com/yourusername/story-chain) | [🐦 Follow on Twitter](https://twitter.com/storychain_dao)

</div>