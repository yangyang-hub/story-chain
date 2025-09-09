// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/StoryChain.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract StoryChainTest is Test {
    StoryChain public storyChain;

    // Event declarations for testing
    event StoryCreated(uint256 indexed storyId, address indexed author, string ipfsHash);

    address public owner;
    address public storyAuthor;
    address public chapterAuthor;
    address public forker;
    address public tipper;
    address public randomUser;

    uint256 public constant INITIAL_DEPOSIT = 10 ether;
    uint256 public constant FORK_FEE = 1 ether;

    string public constant STORY_IPFS = "story_ipfs_hash";
    string public constant CHAPTER_1_IPFS = "chapter_1_ipfs_hash";
    string public constant CHAPTER_2_IPFS = "chapter_2_ipfs_hash";
    string public constant FORK_IPFS = "fork_ipfs_hash";
    string public constant COMMENT_IPFS = "comment_ipfs_hash";

    function setUp() public {
        storyChain = new StoryChain();

        owner = storyChain.owner();
        storyAuthor = makeAddr("storyAuthor");
        chapterAuthor = makeAddr("chapterAuthor");
        forker = makeAddr("forker");
        tipper = makeAddr("tipper");
        randomUser = makeAddr("randomUser");

        vm.deal(storyAuthor, 20 ether);
        vm.deal(chapterAuthor, 20 ether);
        vm.deal(forker, 20 ether);
        vm.deal(tipper, 20 ether);
    }

    // =================================
    //         Story Creation
    // =================================

    function test_CreateStory_Success_Free() public {
        // Expect the StoryCreated event to be emitted
        vm.expectEmit(true, true, false, true);
        emit StoryCreated(1, storyAuthor, STORY_IPFS);
        
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);

        StoryChain.Story memory story = storyChain.getStory(1);
        assertEq(story.id, 1);
        assertEq(story.author, storyAuthor);
        assertEq(story.ipfsHash, STORY_IPFS);
        assertEq(story.forkFee, FORK_FEE);
        assertEq(story.isDeposited, false);
        assertEq(storyChain.ownerOf(1), storyAuthor);
    }

    function test_CreateStory_Fail_FreeWithDeposit() public {
        vm.prank(storyAuthor);
        vm.expectRevert("No deposit required for first 100 stories");
        storyChain.createStory{value: 1 ether}(STORY_IPFS, FORK_FEE);
    }

    function test_CreateStory_Success_WithDeposit() public {
        // Exhaust free stories
        for (uint256 i = 0; i < storyChain.FREE_STORY_COUNT(); i++) {
            vm.prank(makeAddr(string(abi.encodePacked("user", i))));
            storyChain.createStory("temp_ipfs", 0);
        }

        vm.prank(storyAuthor);
        storyChain.createStory{value: INITIAL_DEPOSIT}(STORY_IPFS, FORK_FEE);

        uint256 storyId = storyChain.FREE_STORY_COUNT() + 1;
        StoryChain.Story memory story = storyChain.getStory(storyId);
        assertEq(story.author, storyAuthor);
        assertTrue(story.isDeposited);
        assertEq(story.deposited, INITIAL_DEPOSIT);
        assertEq(address(storyChain).balance, INITIAL_DEPOSIT);
    }

    function test_CreateStory_Fail_InsufficientDeposit() public {
        // Exhaust free stories
        for (uint256 i = 0; i < storyChain.FREE_STORY_COUNT(); i++) {
            vm.prank(makeAddr(string(abi.encodePacked("user", i))));
            storyChain.createStory("temp_ipfs", 0);
        }

        vm.prank(storyAuthor);
        vm.expectRevert("Insufficient deposit");
        storyChain.createStory{value: INITIAL_DEPOSIT - 1}(STORY_IPFS, FORK_FEE);
    }

    // =================================
    //        Chapter Creation
    // =================================

    function test_CreateChapter_Success_FirstChapter() public {
        // 1. Create Story
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);
        uint256 storyId = 1;

        // 2. Create First Chapter
        vm.prank(storyAuthor);
        storyChain.createChapter(storyId, 0, CHAPTER_1_IPFS, FORK_FEE);
        uint256 chapterId = 2;

        StoryChain.Chapter memory chapter = storyChain.getChapter(chapterId);
        assertEq(chapter.id, chapterId);
        assertEq(chapter.storyId, storyId);
        assertEq(chapter.parentId, 0);
        assertEq(chapter.author, storyAuthor);
        assertEq(chapter.chapterNumber, 1);
        assertEq(storyChain.ownerOf(chapterId), storyAuthor);

        StoryChain.Story memory story = storyChain.getStory(storyId);
        assertEq(story.firstChapterId, chapterId);
    }

    function test_CreateChapter_Fail_FirstChapterNotByStoryAuthor() public {
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);

        vm.prank(randomUser);
        vm.expectRevert("Not the story owner");
        storyChain.createChapter(1, 0, CHAPTER_1_IPFS, FORK_FEE);
    }
    
    function test_CreateChapter_Success_Continuation() public {
        // 1. Create Story and First Chapter
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);
        vm.prank(storyAuthor);
        storyChain.createChapter(1, 0, CHAPTER_1_IPFS, FORK_FEE);
        
        // Transfer chapter ownership to chapterAuthor for continuation
        vm.prank(storyAuthor);
        storyChain.transferFrom(storyAuthor, chapterAuthor, 2);

        // 2. Create Continuation Chapter
        vm.prank(chapterAuthor);
        storyChain.createChapter(1, 2, CHAPTER_2_IPFS, FORK_FEE);
        uint256 newChapterId = 3;

        StoryChain.Chapter memory chapter = storyChain.getChapter(newChapterId);
        assertEq(chapter.parentId, 2);
        assertEq(chapter.author, chapterAuthor);
        assertEq(chapter.chapterNumber, 2);

        StoryChain.Chapter memory parentChapter = storyChain.getChapter(2);
        assertEq(parentChapter.childChapterIds.length, 1);
        assertEq(parentChapter.childChapterIds[0], newChapterId);
    }

    function test_CreateChapter_Fail_ContinuationNotByParentAuthor() public {
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);
        vm.prank(storyAuthor);
        storyChain.createChapter(1, 0, CHAPTER_1_IPFS, FORK_FEE);

        vm.prank(randomUser);
        vm.expectRevert("Not the chapter author");
        storyChain.createChapter(1, 2, CHAPTER_2_IPFS, FORK_FEE);
    }

    // =================================
    //         Forking & Rewards
    // =================================

    function test_ForkStory_And_DistributeRewards() public {
        // 1. Setup: Create story and chapter
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE); // Story ID 1
        vm.prank(storyAuthor);
        storyChain.createChapter(1, 0, CHAPTER_1_IPFS, FORK_FEE); // Chapter ID 2

        // 2. Fork
        vm.prank(forker);
        storyChain.forkStory{value: FORK_FEE}(1, 2, FORK_IPFS, FORK_FEE);
        uint256 forkChapterId = 3;

        // 3. Verify Fork
        StoryChain.Chapter memory forkChapter = storyChain.getChapter(forkChapterId);
        assertEq(forkChapter.author, forker);
        assertEq(forkChapter.parentId, 2);

        StoryChain.Story memory story = storyChain.getStory(1);
        assertEq(story.forkCount, 1);

        // 4. Verify Reward Distribution (no platform fee, all goes to authors)
        uint256 storyAuthorFee = (FORK_FEE * storyChain.FORK_FEE_AUTHOR()) / 100;
        uint256 chapterAuthorFee = FORK_FEE - storyAuthorFee;

        // No platform fee, so owner should have no pending withdrawals
        assertEq(storyChain.pendingWithdrawals(owner), 0);
        // In this case, storyAuthor is also the chapterAuthor, so their rewards are combined
        assertEq(storyChain.pendingWithdrawals(storyAuthor), storyAuthorFee + chapterAuthorFee);
    }

    function test_WithdrawRewards_Success() public {
        // 1. Fork to generate rewards
        test_ForkStory_And_DistributeRewards();

        // 2. Withdraw
        uint256 initialBalance = storyAuthor.balance;
        uint256 pending = storyChain.pendingWithdrawals(storyAuthor);
        assertTrue(pending > 0);

        vm.prank(storyAuthor);
        storyChain.withdrawRewards();

        assertEq(storyChain.pendingWithdrawals(storyAuthor), 0);
        assertEq(storyAuthor.balance, initialBalance + pending);
    }

    // =================================
    //         Deposit Refund
    // =================================

    function test_DepositRefund_Success() public {
        // 1. Exhaust free stories and create one with deposit
        for (uint256 i = 0; i < storyChain.FREE_STORY_COUNT(); i++) {
            vm.prank(makeAddr(string(abi.encodePacked("user", i))));
            storyChain.createStory("temp_ipfs", 0);
        }
        uint256 storyId = storyChain.FREE_STORY_COUNT() + 1;
        vm.prank(storyAuthor);
        storyChain.createStory{value: INITIAL_DEPOSIT}(STORY_IPFS, FORK_FEE);

        // 2. Create 100 chapters
        vm.prank(storyAuthor);
        storyChain.createChapter(storyId, 0, "ipfs", FORK_FEE);
        uint256 parentId = storyChain.FREE_STORY_COUNT() + 2;

        uint256 initialBalance = storyAuthor.balance;

        for (uint256 i = 1; i < 99; i++) {
            vm.prank(storyAuthor);
            storyChain.createChapter(storyId, parentId, "ipfs", FORK_FEE);
            parentId++;
        }
        
        // The 100th chapter creation should trigger the refund
        vm.prank(storyAuthor);
        storyChain.createChapter(storyId, parentId, "ipfs", FORK_FEE);

        // 3. Verify refund
        StoryChain.Story memory story = storyChain.getStory(storyId);
        assertFalse(story.isDeposited);
        assertEq(storyAuthor.balance, initialBalance + INITIAL_DEPOSIT);
    }

    // =================================
    //         Social Features
    // =================================

    function test_LikeStory() public {
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);

        vm.prank(randomUser);
        storyChain.likeStory(1);

        StoryChain.Story memory story = storyChain.getStory(1);
        assertEq(story.likes, 1);

        // Test double like
        vm.prank(randomUser);
        vm.expectRevert("Already liked this story");
        storyChain.likeStory(1);
    }

    function test_AddComment() public {
        vm.prank(storyAuthor);
        storyChain.createStory(STORY_IPFS, FORK_FEE);
        uint256 storyId = 1;

        vm.prank(randomUser);
        storyChain.addComment(storyId, COMMENT_IPFS);

        // The public getter for a mapping to an array requires an index.
        // It returns the struct's fields, not the struct itself.
        (uint256 tokenId, address commenter, string memory ipfsHash, uint256 timestamp) = storyChain.comments(storyId, 0);

        assertEq(tokenId, storyId);
        assertEq(commenter, randomUser);
        assertEq(ipfsHash, COMMENT_IPFS);
        assertTrue(timestamp > 0);
    }

    // =================================
    //         Admin Functions
    // =================================

    function test_UpdateStoryDeposit_ByOwner() public {
        uint256 newDeposit = 5 ether;
        vm.prank(owner);
        storyChain.updateStoryDeposit(newDeposit);
        assertEq(storyChain.DEFAULT_STORY_DEPOSIT(), newDeposit);
    }

    function test_UpdateStoryDeposit_Fail_NotOwner() public {
        vm.prank(randomUser);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, randomUser));
        storyChain.updateStoryDeposit(5 ether);
    }
}
