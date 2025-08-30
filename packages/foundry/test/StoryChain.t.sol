// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/StoryChain.sol";

contract StoryChainTest is Test {
    StoryChain public storyChain;
    
    // 测试用户地址
    address public owner = address(this);
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public user3 = makeAddr("user3");
    
    // 接收ETH函数
    receive() external payable {}
    
    // 测试常量
    string constant STORY_IPFS_HASH = "QmStoryHash123";
    string constant CHAPTER1_IPFS_HASH = "QmChapter1Hash456";
    string constant CHAPTER2_IPFS_HASH = "QmChapter2Hash789";
    string constant FORK_IPFS_HASH = "QmForkHash999";
    string constant COMMENT_IPFS_HASH = "QmCommentHash111";
    
    uint256 constant MIN_STORY_FEE = 0.001 ether;
    uint256 constant BID_AMOUNT_1 = 1 ether;
    uint256 constant BID_AMOUNT_2 = 2 ether;
    
    // 事件定义（用于测试事件发射）
    event ChapterCreated(uint256 indexed chapterId, uint256 indexed parentId, address indexed author, string ipfsHash);
    event BidPlaced(uint256 indexed chapterId, address indexed bidder, uint256 amount);
    event StoryForked(uint256 indexed originalChapterId, uint256 indexed newChapterId, address indexed forker);
    event ChapterLiked(uint256 indexed chapterId, address indexed liker, uint256 newLikeCount);
    event CommentAdded(uint256 indexed chapterId, address indexed commenter, uint256 commentIndex);
    event RewardsDistributed(uint256 indexed chapterId, uint256 totalAmount);
    
    function setUp() public {
        storyChain = new StoryChain();
        
        // 为测试用户提供ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }
    
    // ============ 基础合约测试 ============
    
    function testContractDeployment() public {
        // 测试合约基本信息
        assertEq(storyChain.name(), "StoryChain");
        assertEq(storyChain.symbol(), "STORY");
        assertEq(storyChain.owner(), owner);
    }
    
    function testConstants() public {
        assertEq(storyChain.FORK_MULTIPLIER(), 120);
        assertEq(storyChain.PLATFORM_FEE_RATE(), 5);
    }
    
    // ============ 故事和章节创建测试 ============
    
    function testCreateStoryStart() public {
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit ChapterCreated(0, 0, user1, STORY_IPFS_HASH);
        
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 验证章节信息
        StoryChain.Chapter memory chapter = storyChain.getChapter(0);
        assertEq(chapter.id, 0);
        assertEq(chapter.parentId, 0);
        assertEq(chapter.author, user1);
        assertEq(chapter.ipfsHash, STORY_IPFS_HASH);
        assertEq(chapter.likes, 0);
        assertTrue(chapter.isStoryStart);
        assertEq(chapter.totalReward, 0);
        
        // 验证NFT铸造
        assertEq(storyChain.ownerOf(0), user1);
        assertEq(storyChain.tokenURI(0), STORY_IPFS_HASH);
    }
    
    function testCreateStoryStartRequiresMinimumFee() public {
        vm.prank(user1);
        vm.expectRevert("Minimum creation fee required for new story");
        storyChain.createChapter{value: 0.0001 ether}(0, STORY_IPFS_HASH);
    }
    
    function testCreateStoryStartRequiresValidIPFS() public {
        vm.prank(user1);
        vm.expectRevert("IPFS hash cannot be empty");
        storyChain.createChapter{value: MIN_STORY_FEE}(0, "");
    }
    
    function testContinueStoryByAuthor() public {
        // 首先创建故事开头 (tokenId = 0)
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 作者续写故事（续写tokenId=0的章节）
        vm.prank(user1);
        storyChain.createChapter{value: 0}(0, CHAPTER1_IPFS_HASH); // parentId=0指向刚创建的第一章
        
        // 验证续章信息
        StoryChain.Chapter memory chapter = storyChain.getChapter(1);
        assertEq(chapter.parentId, 0);
        assertEq(chapter.author, user1);
        assertFalse(chapter.isStoryStart);
    }
    
    function testNonAuthorCannotContinueWithoutBid() public {
        // 创建故事开头
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 非作者尝试续写
        vm.prank(user2);
        vm.expectRevert("Only parent chapter author can continue");
        storyChain.createChapter{value: 0}(0, CHAPTER1_IPFS_HASH);
    }
    
    // ============ 竞标系统测试 ============
    
    function testBidForChapter() public {
        // 创建故事
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 用户2竞标
        vm.prank(user2);
        vm.expectEmit(true, true, true, true);
        emit BidPlaced(0, user2, BID_AMOUNT_1);
        
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
        
        // 验证竞标状态
        assertEq(storyChain.currentHighestBid(0), BID_AMOUNT_1);
        assertEq(storyChain.currentHighestBidder(0), user2);
        
        // 验证竞标记录
        StoryChain.Bid[] memory bids = storyChain.getChapterBids(0);
        assertEq(bids.length, 1);
        assertEq(bids[0].bidder, user2);
        assertEq(bids[0].amount, BID_AMOUNT_1);
        assertTrue(bids[0].isActive);
    }
    
    function testHigherBidOverridesPrevious() public {
        // 创建故事
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 用户2竞标
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
        
        uint256 user2BalanceBefore = user2.balance;
        
        // 用户3出价更高
        vm.prank(user3);
        storyChain.bidForChapter{value: BID_AMOUNT_2}(0);
        
        // 验证用户2收到退款
        assertEq(user2.balance, user2BalanceBefore + BID_AMOUNT_1);
        
        // 验证最新竞标状态
        assertEq(storyChain.currentHighestBid(0), BID_AMOUNT_2);
        assertEq(storyChain.currentHighestBidder(0), user3);
    }
    
    function testBidMustBeHigherThanCurrent() public {
        // 创建故事和初始竞标
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_2}(0);
        
        // 尝试更低的竞标
        vm.prank(user3);
        vm.expectRevert("Bid must be higher than current highest bid");
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
    }
    
    function testWinningBidderCanContinueStory() public {
        // 创建故事
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 用户2竞标获胜
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
        
        // 竞标获胜者续写故事（带奖励分配）
        vm.prank(user2);
        storyChain.createChapter{value: 0.5 ether}(0, CHAPTER1_IPFS_HASH);
        
        // 验证新章节
        StoryChain.Chapter memory chapter = storyChain.getChapter(1);
        assertEq(chapter.author, user2);
        assertEq(chapter.parentId, 0);
        
        // 验证竞标状态重置
        assertEq(storyChain.currentHighestBid(0), 0);
        assertEq(storyChain.currentHighestBidder(0), address(0));
    }
    
    // ============ 奖励分配测试 ============
    
    function testRewardDistribution() public {
        // 创建多层故事链
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user1);
        storyChain.createChapter{value: 0}(0, CHAPTER1_IPFS_HASH);
        
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_1}(1);
        
        uint256 user1BalanceBefore = user1.balance;
        uint256 ownerBalanceBefore = owner.balance;
        
        // 用户2续写并支付奖励
        vm.prank(user2);
        storyChain.createChapter{value: 1 ether}(1, CHAPTER2_IPFS_HASH);
        
        // 验证平台费用（5%）
        uint256 platformFee = (1 ether * 5) / 100;
        assertEq(owner.balance, ownerBalanceBefore + platformFee);
        
        // 验证作者获得奖励
        assertGt(user1.balance, user1BalanceBefore);
    }
    
    // ============ 故事分叉测试 ============
    
    function testForkStory() public {
        // 创建原始故事和竞标
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
        
        // 计算分叉费用（120%）
        uint256 forkFee = (BID_AMOUNT_1 * 120) / 100;
        
        vm.prank(user3);
        storyChain.forkStory{value: forkFee}(0, FORK_IPFS_HASH);
        
        // 验证分叉章节
        StoryChain.Chapter memory forkChapter = storyChain.getChapter(1);
        assertEq(forkChapter.author, user3);
        assertEq(forkChapter.parentId, 0); // 与原章节相同的父节点
        assertEq(forkChapter.ipfsHash, FORK_IPFS_HASH);
        
        // 验证故事链结构
        uint256[] memory children = storyChain.getStoryChain(0);
        assertEq(children.length, 1);
        assertEq(children[0], 1);
    }
    
    function testForkRequiresSufficientPayment() public {
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
        
        // 尝试支付不足的分叉费用
        vm.prank(user3);
        vm.expectRevert("Insufficient payment for fork");
        storyChain.forkStory{value: BID_AMOUNT_1}(0, FORK_IPFS_HASH);
    }
    
    // ============ 社交功能测试 ============
    
    function testLikeChapter() public {
        // 创建章节
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 用户2点赞
        vm.prank(user2);
        vm.expectEmit(true, true, false, true);
        emit ChapterLiked(0, user2, 1);
        
        storyChain.likeChapter(0);
        
        // 验证点赞状态
        StoryChain.Chapter memory chapter = storyChain.getChapter(0);
        assertEq(chapter.likes, 1);
        assertTrue(storyChain.hasLiked(user2, 0));
    }
    
    function testCannotLikeSameChapterTwice() public {
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user2);
        storyChain.likeChapter(0);
        
        // 尝试再次点赞
        vm.prank(user2);
        vm.expectRevert("Already liked this chapter");
        storyChain.likeChapter(0);
    }
    
    function testAddComment() public {
        // 创建章节
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 添加评论
        vm.prank(user2);
        vm.expectEmit(true, true, false, true);
        emit CommentAdded(0, user2, 0);
        
        storyChain.addComment(0, COMMENT_IPFS_HASH);
        
        // 验证评论
        assertEq(storyChain.getCommentCount(0), 1);
        
        StoryChain.Comment memory comment = storyChain.getComment(0, 0);
        assertEq(comment.chapterId, 0);
        assertEq(comment.commenter, user2);
        assertEq(comment.ipfsHash, COMMENT_IPFS_HASH);
        assertGt(comment.timestamp, 0);
    }
    
    function testCommentRequiresValidIPFS() public {
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user2);
        vm.expectRevert("Comment IPFS hash cannot be empty");
        storyChain.addComment(0, "");
    }
    
    // ============ 视图函数测试 ============
    
    function testGetStoryChain() public {
        // 创建故事树结构
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user1);
        storyChain.createChapter{value: 0}(0, CHAPTER1_IPFS_HASH);
        
        vm.prank(user1);
        storyChain.createChapter{value: 0}(0, CHAPTER2_IPFS_HASH);
        
        // 验证故事链
        uint256[] memory children = storyChain.getStoryChain(0);
        assertEq(children.length, 2);
        assertEq(children[0], 1);
        assertEq(children[1], 2);
    }
    
    function testGetNonexistentChapter() public {
        vm.expectRevert("Chapter does not exist");
        storyChain.getChapter(999);
    }
    
    function testGetCommentOutOfBounds() public {
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.expectRevert("Comment index out of bounds");
        storyChain.getComment(0, 0);
    }
    
    // ============ 所有者功能测试 ============
    
    function testEmergencyWithdraw() public {
        // 向合约发送一些ETH
        vm.deal(address(storyChain), 5 ether);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        storyChain.emergencyWithdraw();
        
        assertEq(owner.balance, ownerBalanceBefore + 5 ether);
        assertEq(address(storyChain).balance, 0);
    }
    
    function testOnlyOwnerCanEmergencyWithdraw() public {
        vm.prank(user1);
        vm.expectRevert();
        storyChain.emergencyWithdraw();
    }
    
    // ============ 边界情况和安全测试 ============
    
    function testCannotBidOnNonexistentChapter() public {
        vm.prank(user1);
        vm.expectRevert("Chapter does not exist");
        storyChain.bidForChapter{value: BID_AMOUNT_1}(999);
    }
    
    function testCannotLikeNonexistentChapter() public {
        vm.prank(user1);
        vm.expectRevert("Chapter does not exist");
        storyChain.likeChapter(999);
    }
    
    function testCannotCommentOnNonexistentChapter() public {
        vm.prank(user1);
        vm.expectRevert("Chapter does not exist");
        storyChain.addComment(999, COMMENT_IPFS_HASH);
    }
    
    function testCannotForkNonexistentChapter() public {
        vm.prank(user1);
        vm.expectRevert("Original chapter does not exist");
        storyChain.forkStory{value: BID_AMOUNT_1}(999, FORK_IPFS_HASH);
    }
    
    function testBidWithZeroAmount() public {
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        vm.prank(user2);
        vm.expectRevert("Bid amount must be greater than 0");
        storyChain.bidForChapter{value: 0}(0);
    }
    
    // ============ 复杂场景测试 ============
    
    function testCompleteStoryWorkflow() public {
        // 1. 用户1创建故事开头
        vm.prank(user1);
        storyChain.createChapter{value: MIN_STORY_FEE}(0, STORY_IPFS_HASH);
        
        // 2. 用户2竞标续写权
        vm.prank(user2);
        storyChain.bidForChapter{value: BID_AMOUNT_1}(0);
        
        // 3. 用户2获胜并续写
        vm.prank(user2);
        storyChain.createChapter{value: 0.5 ether}(0, CHAPTER1_IPFS_HASH);
        
        // 4. 用户3分叉故事
        uint256 forkFee = (BID_AMOUNT_1 * 120) / 100;
        vm.prank(user3);
        storyChain.forkStory{value: forkFee}(0, FORK_IPFS_HASH);
        
        // 5. 用户们点赞和评论
        vm.prank(user1);
        storyChain.likeChapter(1);
        
        vm.prank(user2);
        storyChain.likeChapter(2);
        
        vm.prank(user3);
        storyChain.addComment(1, COMMENT_IPFS_HASH);
        
        // 验证最终状态
        assertEq(storyChain.getStoryChain(0).length, 2); // 两个分支
        assertEq(storyChain.getChapter(1).likes, 1);
        assertEq(storyChain.getChapter(2).likes, 1);
        assertEq(storyChain.getCommentCount(1), 1);
    }
}