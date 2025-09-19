// 区块链数据类型定义

export interface StoryData {
  id: bigint;
  author: string;
  ipfsHash: string;
  createdTime: bigint;
  likes: bigint;
  forkCount: bigint;
  forkFee: bigint;
  isDeposited: boolean;
  deposited: bigint;
  totalTips: bigint;
  totalTipCount: bigint;
  totalForkFees: bigint;
  firstChapterId: bigint;
}

export interface ChapterData {
  id: bigint;
  parentId: bigint;
  storyId: bigint;
  author: string;
  ipfsHash: string;
  createdTime: bigint;
  likes: bigint;
  forkCount: bigint;
  forkFee: bigint;
  totalForkFees: bigint;
  totalTips: bigint;
  totalTipCount: bigint;
  chapterNumber: bigint;
  childChapterIds: readonly bigint[];
}

export interface CommentData {
  tokenId: bigint;
  commenter: string;
  ipfsHash: string;
  timestamp: bigint;
}

// 分析数据类型
export interface AnalyticsData {
  totalStories: number;
  totalChapters: number;
  totalComments: number;
  totalAuthors: number;
  totalLikes: number;
  totalTips: string;
  mostLikedStoryId: string | null;
  mostForkedStoryId: string | null;
  topAuthors: {
    address: string;
    storyCount: number;
    chapterCount: number;
    totalEarnings: string;
  }[];
  recentActivity: {
    type: string;
    timestamp: string;
    data: any;
  }[];
}

// 带有IPFS元数据的类型
export interface StoryWithMetadata extends StoryData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface ChapterWithMetadata extends ChapterData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface CommentWithMetadata extends CommentData {
  content?: string;
}

// API响应类型
export interface StoriesResponse {
  stories: StoryData[];
  total: number;
}

export interface ChaptersResponse {
  chapters: ChapterData[];
  total: number;
}

export interface CommentsResponse {
  comments: CommentData[];
  total: number;
}

// 过滤器类型
export interface StoryFilter {
  author?: string;
  offset?: number;
  limit?: number;
}

export interface ChapterFilter {
  storyId?: string;
  author?: string;
  parentId?: string;
  offset?: number;
  limit?: number;
}

export interface CommentFilter {
  tokenId: string;
  offset?: number;
  limit?: number;
}