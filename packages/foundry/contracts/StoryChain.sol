// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StoryChain
 * @dev 故事链智能合约 - 用户可创建故事章节NFT，通过竞标获得续写权，支持分叉和社交功能
 * @author Story Chain Team
 */
contract StoryChain is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // 常量
    // 前100个故事无需质押
    uint256 public constant FREE_STORY_COUNT = 100;
    // 新故事需提交的章节数量，才能返还质押金额
    uint256 public constant MIN_CHAPTERS_FOR_DEPOSIT = 0;
    // fork费用分配 故事作者 15%
    uint256 public constant FORK_FEE_AUTHOR = 15;
    // fork费用分配 章节作者 85%
    uint256 public constant FORK_FEE_CHAPTER_AUTHOR = 85;

    // NFT Token ID计数器
    uint256 private _tokenIdCounter;

    // 故事结构体
    struct Story {
        uint256 id; // 故事ID（也是NFT Token ID）
        address author; // 故事作者
        string ipfsHash; // IPFS存储的故事内容哈希
        uint256 createdTime; // 创建时间
        uint256 likes; // 点赞数
        uint256 forkCount; // fork数量
        uint256 forkFee; // fork所需费用
        bool isDeposited; // 是否质押创作费用
        uint256 deposited; // 质押的创作费用
        uint256 totalTips; // 获得打赏费用
        uint256 totalTipCount; // 获得打赏次数
        uint256 totalForkFees; // 获得fork费用
        uint256 firstChapterId; // 故事第一个章节
    }

    // 章节结构体
    struct Chapter {
        uint256 id; // 章节ID（也是NFT Token ID）
        uint256 parentId; // 父章节ID（0表示故事开头）
        uint256 storyId; // 故事ID
        address author; // 章节作者
        string ipfsHash; // IPFS存储的章节内容哈希
        uint256 createdTime; // 创建时间
        uint256 likes; // 点赞数
        uint256 forkCount; // fork数量
        uint256 forkFee; // fork所需费用
        uint256 totalForkFees; // 获得fork费用
        uint256 totalTips; // 获得打赏费用
        uint256 totalTipCount; // 获得打赏次数
        uint256 chapterNumber; // 故事章节号
        uint256[] childChapterIds; // 子章节列表
    }

    // 评论结构体
    struct Comment {
        uint256 tokenId; // 章节/故事ID
        address commenter; // 评论者
        string ipfsHash; // 评论内容的IPFS哈希
        uint256 timestamp; // 评论时间
    }

    // 状态变量
    // 创建故事默认质押金额（提交100章节后返回质押金额）
    uint256 public DEFAULT_STORY_DEPOSIT = 0 ether;
    uint256[] public stories; // 故事集合
    mapping(uint256 => Story) public storiesMap; // 故事映射
    mapping(uint256 => Chapter) public chaptersMap; // 章节映射
    mapping(uint256 => Comment[]) public comments; // 章节/故事评论
    mapping(address => mapping(uint256 => bool)) public hasLiked; // 用户对章节/故事的点赞状态

    // 待提取金额
    mapping(address => uint256) public pendingWithdrawals;

    // 事件定义
    event StoryCreated(uint256 indexed storyId, address indexed author, string ipfsHash);
    event ChapterCreated(
        uint256 indexed storyId, uint256 indexed chapterId, uint256 parentId, address indexed author, string ipfsHash
    );
    event ChapterForked(
        uint256 indexed storyId, uint256 indexed chapterId, uint256 parentId, address indexed author, string ipfsHash
    );
    event ChapterLiked(uint256 indexed chapterId, address indexed liker, uint256 newLikeCount);
    event StoryLiked(uint256 indexed storyId, address indexed liker, uint256 newLikeCount);
    event CommentAdded(uint256 indexed chapterId, address indexed commenter);
    event StoryRewardsDistributed(uint256 indexed storyId, address indexed storyAuthor, uint256 amount);
    event ChapterRewardsDistributed(uint256 indexed chapterId, address indexed chapterAuthor, uint256 amount);
    event TipSent(uint256 indexed chapterId, address indexed tipper, uint256 amount);
    event RewardsWithdrawn(address indexed user, uint256 amount);
    event DepositRefunded(uint256 indexed storyId, address indexed author, uint256 amount);

    constructor() ERC721("StoryChain", "STORY") Ownable(msg.sender) { }

    /**
     * @dev 检查章节是否存在
     * @param tokenId 章节ID
     * @return 章节是否存在
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // 创建新的故事
    function createStory(string memory ipfsHash, uint256 forkFee) external payable nonReentrant {
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        // 检查是否需要质押
        if (stories.length < FREE_STORY_COUNT) {
            require(msg.value == 0, "No deposit required for first 100 stories");
        } else {
            require(msg.value >= DEFAULT_STORY_DEPOSIT, "Insufficient deposit");
        }

        // 创建新故事
        _tokenIdCounter++;
        uint256 newStoryId = _tokenIdCounter;
        stories.push(newStoryId);

        storiesMap[newStoryId] = Story({
            id: newStoryId,
            author: msg.sender,
            ipfsHash: ipfsHash,
            createdTime: block.timestamp,
            likes: 0,
            forkCount: 0,
            forkFee: forkFee,
            totalForkFees: 0,
            totalTips: 0,
            totalTipCount: 0,
            firstChapterId: 0,
            isDeposited: msg.value > 0,
            deposited: msg.value
        });

        // 铸造NFT给作者
        _safeMint(msg.sender, newStoryId);
        _setTokenURI(newStoryId, ipfsHash);

        emit StoryCreated(newStoryId, msg.sender, ipfsHash);
    }

    /**
     * @dev 创建新的故事章节（可以是故事开头或续写章节）
     * @param storyId 故事ID
     * @param parentId 父章节ID（0表示新故事开头）
     * @param ipfsHash 章节内容的IPFS哈希
     */
    function createChapter(uint256 storyId, uint256 parentId, string memory ipfsHash, uint256 forkFee)
        external
        nonReentrant
    {
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        // 检查是否是创建新故事开头
        bool isNewStory = parentId == 0;
        Story storage story = storiesMap[storyId];
        Chapter storage parentChapter = chaptersMap[parentId];
        if (isNewStory) {
            // 校验故事是否存在
            require(story.id != 0, "Story does not exist");
            // 新的故事开头 校验是否为故事的所有者
            require(msg.sender == story.author, "Not the story owner");
            // 校验故事是否已经存在开头
            require(story.firstChapterId == 0, "Story already has a start chapter");
        } else {
            // 校验章节是否存在
            require(parentChapter.id != 0, "Parent chapter does not exist");
            // 校验章节是否属于该故事
            require(parentChapter.storyId == storyId, "Chapter does not belong to this story");
            // 校验是否有用该章节的续写权（仅支持上一章节的作者续写）
            require(msg.sender == _ownerOf(parentId), "Not the chapter author");
        }
        // 创建新章节
        _tokenIdCounter++;
        uint256 newChapterId = _tokenIdCounter;

        chaptersMap[newChapterId] = Chapter({
            id: newChapterId,
            parentId: parentId,
            storyId: storyId,
            author: msg.sender,
            ipfsHash: ipfsHash,
            createdTime: block.timestamp,
            likes: 0,
            forkCount: 0,
            forkFee: forkFee,
            totalTips: 0,
            totalTipCount: 0,
            totalForkFees: 0,
            chapterNumber: isNewStory ? 1 : parentChapter.chapterNumber + 1,
            childChapterIds: new uint256[](0)
        });
        if (isNewStory) {
            story.firstChapterId = newChapterId;
        } else {
            parentChapter.childChapterIds.push(newChapterId);
        }

        // 铸造NFT给作者
        _safeMint(msg.sender, newChapterId);
        _setTokenURI(newChapterId, ipfsHash);

        // 判断是否满足创建质押资金返还条件
        if (story.author == msg.sender && story.isDeposited && parentChapter.chapterNumber >= MIN_CHAPTERS_FOR_DEPOSIT)
        {
            // 返还质押资金
            story.isDeposited = false;
            payable(msg.sender).transfer(story.deposited);
            // 记录事件
            emit DepositRefunded(storyId, msg.sender, story.deposited);
        }

        emit ChapterCreated(storyId, newChapterId, parentId, msg.sender, ipfsHash);
    }

    /**
     * @dev 分叉故事
     * @param storyId 故事ID
     * @param parentId 原章节ID
     * @param ipfsHash 新章节内容的IPFS哈希
     */
    function forkStory(uint256 storyId, uint256 parentId, string memory ipfsHash, uint256 forkFee)
        external
        payable
        nonReentrant
    {
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        // 校验章节是否存在
        Chapter storage parentChapter = chaptersMap[parentId];
        require(parentChapter.id != 0, "Parent chapter does not exist");

        // 校验故事是否存在
        Story storage story = storiesMap[storyId];
        require(story.id != 0, "Story does not exist");

        // 校验章节是否属于该故事
        require(parentChapter.storyId == storyId, "Chapter does not belong to this story");

        // 校验分叉费用（应该支付被分叉章节设置的费用）
        require(msg.value >= parentChapter.forkFee, "Insufficient payment for fork");

        // 创建分叉章节
        _tokenIdCounter++;
        uint256 newChapterId = _tokenIdCounter;

        chaptersMap[newChapterId] = Chapter({
            id: newChapterId,
            parentId: parentId,
            storyId: storyId,
            author: msg.sender,
            ipfsHash: ipfsHash,
            createdTime: block.timestamp,
            likes: 0,
            forkCount: 0,
            forkFee: forkFee,
            totalTips: 0,
            totalTipCount: 0,
            totalForkFees: 0,
            chapterNumber: parentChapter.chapterNumber + 1,
            childChapterIds: new uint256[](0)
        });
        parentChapter.childChapterIds.push(newChapterId);

        // 铸造NFT
        _safeMint(msg.sender, newChapterId);
        _setTokenURI(newChapterId, ipfsHash);

        // 分配分叉费用（分给原故事链的作者们）
        (uint256 storyFee, uint256 chapterFee) =
            _distributeRewards(storyId, parentId, story.author, parentChapter.author, msg.value);
        story.totalForkFees += storyFee;
        parentChapter.totalForkFees += chapterFee;

        story.forkCount++;
        parentChapter.forkCount++;

        emit ChapterForked(storyId, newChapterId, parentId, msg.sender, ipfsHash);
    }

    /**
     * @dev 为故事点赞
     * @param storyId 故事ID
     */
    function likeStory(uint256 storyId) external {
        Story storage story = storiesMap[storyId];
        // 校验故事是否存在
        require(story.id != 0, "Story does not exist");
        require(!hasLiked[msg.sender][storyId], "Already liked this story");

        story.likes++;
        hasLiked[msg.sender][storyId] = true;

        emit StoryLiked(storyId, msg.sender, story.likes);
    }

    /**
     * @dev 为章节点赞
     * @param chapterId 章节ID
     */
    function likeChapter(uint256 chapterId) external {
        Chapter storage chapter = chaptersMap[chapterId];
        require(chapter.id != 0, "Chapter does not exist");
        require(!hasLiked[msg.sender][chapterId], "Already liked this chapter");

        chapter.likes++;
        hasLiked[msg.sender][chapterId] = true;

        emit ChapterLiked(chapterId, msg.sender, chapter.likes);
    }

    /**
     * @dev 添加评论
     * @param tokenId 故事/章节Id
     * @param ipfsHash 评论内容的IPFS哈希
     */
    function addComment(uint256 tokenId, string memory ipfsHash) external {
        require(_exists(tokenId), "Chapter does not exist");
        require(bytes(ipfsHash).length > 0, "Comment IPFS hash cannot be empty");

        comments[tokenId].push(
            Comment({ tokenId: tokenId, commenter: msg.sender, ipfsHash: ipfsHash, timestamp: block.timestamp })
        );

        emit CommentAdded(tokenId, msg.sender);
    }

    /**
     * @dev 分发fork奖励给故事作者和章节作者
     * @param storyId 故事ID
     * @param chapterId 章节ID
     * @param storyAuthor 故事作者地址
     * @param chapterAuthor 章节作者地址
     * @param totalAmount 总奖励金额
     */
    function _distributeRewards(
        uint256 storyId,
        uint256 chapterId,
        address storyAuthor,
        address chapterAuthor,
        uint256 totalAmount
    ) internal returns (uint256 storyFee, uint256 chapterFee) {
        if (totalAmount == 0) return (0, 0);

        uint256 storyAuthorFee = (totalAmount * FORK_FEE_AUTHOR) / 100;
        pendingWithdrawals[storyAuthor] += storyAuthorFee;
        uint256 chapterAuthorFee = totalAmount - storyAuthorFee;
        pendingWithdrawals[chapterAuthor] += chapterAuthorFee;
        emit StoryRewardsDistributed(storyId, storyAuthor, storyAuthorFee);
        emit ChapterRewardsDistributed(chapterId, chapterAuthor, chapterAuthorFee);
        return (storyAuthorFee, chapterAuthorFee);
    }

    // 打赏
    function tip(uint256 chapterId) external payable {
        require(msg.value > 0, "Tip amount must be greater than 0");
        // Story storage story = storiesMap[storyId];
        Chapter storage chapter = chaptersMap[chapterId];
        // (uint256 storyFee, uint256 chapterFee) =
            // _distributeRewards(storyId, chapterId, story.author, chapter.author, msg.value);

        // Only add tips to chapter, not to story to avoid double counting
        // story.totalTips += msg.value;  // Removed to prevent double display
        chapter.totalTips += msg.value;
        // story.totalTipCount += 1;
        chapter.totalTipCount += 1;
        pendingWithdrawals[chapter.author] += msg.value;
        emit TipSent(chapterId, msg.sender, msg.value);
    }

    // 提取奖励
    function withdrawRewards() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No rewards to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit RewardsWithdrawn(msg.sender, amount);
    }

    // 章节作者修改fork费用
    function updateChapterForkFee(uint256 chapterId, uint256 newForkFee) external {
        Chapter storage chapter = chaptersMap[chapterId];
        require(chapter.author == msg.sender, "Not the chapter author");
        chapter.forkFee = newForkFee;
    }

    // 故事作者修改fork费用
    function updateStoryForkFee(uint256 storyId, uint256 newForkFee) external {
        Story storage story = storiesMap[storyId];
        require(story.author == msg.sender, "Not the story author");
        story.forkFee = newForkFee;
    }

    /**
     * @dev 获取故事信息
     * @param storyId 故事ID
     * @return Story结构体
     */
    function getStory(uint256 storyId) external view returns (Story memory) {
        return storiesMap[storyId];
    }

    /**
     * @dev 获取章节信息
     * @param chapterId 章节ID
     * @return Chapter结构体
     */
    function getChapter(uint256 chapterId) external view returns (Chapter memory) {
        return chaptersMap[chapterId];
    }

    // 查询创建故事所需质押金额
    function getStoryDeposit() external view returns (uint256) {
        return DEFAULT_STORY_DEPOSIT;
    }

    // 重写必要的函数
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // 管理员修改创建故事所需质押金额
    function updateStoryDeposit(uint256 newDeposit) external onlyOwner {
        DEFAULT_STORY_DEPOSIT = newDeposit;
    }
}
