export interface ChainDataStore {
  stories: StoryData[];
  chapters: ChapterData[];
  comments: CommentData[];
  analytics: AnalyticsData;
  lastUpdateBlock: number;
  lastUpdateTime: string;
}

export interface StoryData {
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

export interface ChapterData {
  id: string;
  storyId: string;
  parentId: string;
  author: string;
  ipfsHash: string;
  createdTime: number;
  likes: number;
  forkCount: number;
  chapterNumber: number;
  forkFee: string;
  totalTips: string;
  totalTipCount: number;
  blockNumber: number;
  transactionHash: string;
}

export interface AnalyticsData {
  totalStories: number;
  totalChapters: number;
  totalComments: number;
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
    type: "story_created" | "chapter_created" | "story_liked" | "chapter_liked" | "tip_sent" | "comment_added";
    timestamp: number;
    data: any;
  }>;
}

export interface CommentData {
  id: string; // 使用事件的transactionHash-logIndex作为唯一ID
  tokenId: string; // 故事或章节ID
  commenter: string;
  ipfsHash: string;
  createdTime: number;
  blockNumber: number;
  transactionHash: string;
}
