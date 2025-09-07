import { EdgeConfigClient, createClient } from "@vercel/edge-config";
import { replacer } from "~~/utils/scaffold-eth/common";

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
    type: "story_created" | "chapter_created" | "story_liked" | "chapter_liked" | "tip_sent";
    timestamp: number;
    data: any;
  }>;
}

export class EdgeConfigStore {
  private configKey = "chain_data";
  private client: EdgeConfigClient;

  constructor() {
    const connectionString = process.env.NEXT_PUBLIC_EDGE_CONFIG;
    console.log("connectionString:", connectionString);
    if (!connectionString) {
      throw new Error("Edge Config connection string not found in environment variables.");
    }
    this.client = createClient(connectionString);
  }

  async getData(): Promise<ChainDataStore | null> {
    try {
      const data = await this.client.get(this.configKey);
      return data as ChainDataStore | null;
    } catch (error) {
      console.error("Failed to get data from Edge Config:", error);
      return null;
    }
  }

  async updateData(newData: Partial<ChainDataStore>): Promise<void> {
    try {
      console.log("newData:", newData);

      // Edge Config client doesn't have update methods - it's read-only
      // We need to use the Vercel Management API for updates
      
      // First, try to check if client has any update methods (it won't)
      console.log("Available client methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(this.client)));
      
      // Since this.client is read-only, we must use the Management API
      const edgeConfigId = process.env.NEXT_PUBLIC_EDGE_CONFIG_ID;
      const vercelApiToken = process.env.NEXT_PUBLIC_VERCEL_API_TOKEN;

      if (!edgeConfigId || !vercelApiToken) {
        throw new Error("Edge Config credentials not configured. Need VERCEL_API_TOKEN for updates.");
      }

      const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vercelApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            items: [
              {
                operation: "upsert",
                key: this.configKey,
                value: newData,
              },
            ],
          },
          replacer,
        ),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Config update failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to update Edge Config:", error);
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
      time: data.lastUpdateTime,
    };
  }
}
