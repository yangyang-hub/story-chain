import { get } from '@vercel/edge-config';

export interface ChainDataStore {
  stories: StoryData[];
  chapters: ChapterData[];
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
  totalTips: string;
  totalTipCount: number;
  blockNumber: number;
  transactionHash: string;
}

export interface AnalyticsData {
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
    type: 'story_created' | 'chapter_created' | 'story_liked' | 'chapter_liked' | 'tip_sent';
    timestamp: number;
    data: any;
  }>;
}

export class EdgeConfigStore {
  private configKey = 'chain_data';

  async getData(): Promise<ChainDataStore | null> {
    try {
      const data = await get(this.configKey);
      return data as ChainDataStore | null;
    } catch (error) {
      console.error('Failed to get data from Edge Config:', error);
      return null;
    }
  }

  async updateData(newData: Partial<ChainDataStore>): Promise<void> {
    try {
      // Note: For updating Edge Config, we need to use the Management API
      // This requires a server-side implementation with the proper API key
      const response = await fetch('/api/monitor/update-edge-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update Edge Config: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update Edge Config:', error);
      throw error;
    }
  }

  async getStoriesData(): Promise<StoryData[]> {
    const data = await this.getData();
    return data?.stories || [];
  }

  async getChaptersData(): Promise<ChapterData[]> {
    const data = await this.getData();
    return data?.chapters || [];
  }

  async getAnalyticsData(): Promise<AnalyticsData | null> {
    const data = await this.getData();
    return data?.analytics || null;
  }

  async getLastUpdateInfo(): Promise<{ block: number; time: string } | null> {
    const data = await this.getData();
    if (!data) return null;
    
    return {
      block: data.lastUpdateBlock,
      time: data.lastUpdateTime
    };
  }
}