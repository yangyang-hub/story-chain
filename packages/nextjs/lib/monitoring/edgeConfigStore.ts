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
  private keys = {
    stories: "stories_data",
    chapters: "chapters_data", 
    analytics: "analytics_data",
    metadata: "chain_metadata"
  };
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
      const [stories, chapters, analytics, metadata] = await Promise.all([
        this.client.get(this.keys.stories),
        this.client.get(this.keys.chapters), 
        this.client.get(this.keys.analytics),
        this.client.get(this.keys.metadata)
      ]);

      if (!stories || !chapters || !analytics || !metadata) {
        return null;
      }

      return {
        stories: stories as StoryData[],
        chapters: chapters as ChapterData[],
        analytics: analytics as AnalyticsData,
        lastUpdateBlock: (metadata as any).lastUpdateBlock || 0,
        lastUpdateTime: (metadata as any).lastUpdateTime || ""
      };
    } catch (error) {
      console.error("Failed to get data from Edge Config:", error);
      return null;
    }
  }

  async updateData(newData: Partial<ChainDataStore>): Promise<void> {
    try {
      const edgeConfigId = process.env.NEXT_PUBLIC_EDGE_CONFIG_ID;
      const vercelApiToken = process.env.NEXT_PUBLIC_VERCEL_API_TOKEN;

      if (!edgeConfigId || !vercelApiToken) {
        throw new Error("Edge Config credentials not configured. Need VERCEL_API_TOKEN for updates.");
      }

      const items: Array<{operation: string, key: string, value: any}> = [];

      if (newData.stories !== undefined) {
        items.push({
          operation: "upsert",
          key: this.keys.stories,
          value: newData.stories
        });
      }

      if (newData.chapters !== undefined) {
        items.push({
          operation: "upsert", 
          key: this.keys.chapters,
          value: newData.chapters
        });
      }

      if (newData.analytics !== undefined) {
        items.push({
          operation: "upsert",
          key: this.keys.analytics, 
          value: newData.analytics
        });
      }

      if (newData.lastUpdateBlock !== undefined || newData.lastUpdateTime !== undefined) {
        const currentMetadata = await this.client.get(this.keys.metadata) as any || {};
        const metadata = {
          lastUpdateBlock: newData.lastUpdateBlock ?? currentMetadata.lastUpdateBlock,
          lastUpdateTime: newData.lastUpdateTime ?? currentMetadata.lastUpdateTime
        };
        items.push({
          operation: "upsert",
          key: this.keys.metadata,
          value: metadata
        });
      }

      if (items.length === 0) {
        return;
      }

      const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${vercelApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          { items },
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
    try {
      const stories = await this.client.get(this.keys.stories);
      return (stories as unknown as StoryData[]) || [];
    } catch (error) {
      console.error("Failed to get stories data:", error);
      return [];
    }
  }

  async getChaptersData(): Promise<ChapterData[]> {
    try {
      const chapters = await this.client.get(this.keys.chapters);
      return (chapters as unknown as ChapterData[]) || [];
    } catch (error) {
      console.error("Failed to get chapters data:", error);
      return [];
    }
  }

  async getAnalyticsData(): Promise<AnalyticsData | null> {
    try {
      const analytics = await this.client.get(this.keys.analytics);
      return (analytics as unknown as AnalyticsData) || null;
    } catch (error) {
      console.error("Failed to get analytics data:", error);
      return null;
    }
  }

  async getLastUpdateInfo(): Promise<{ block: number; time: string } | null> {
    try {
      const metadata = (await this.client.get(this.keys.metadata)) as any;
      if (!metadata) return null;

      return {
        block: metadata.lastUpdateBlock || 0,
        time: metadata.lastUpdateTime || "",
      };
    } catch (error) {
      console.error("Failed to get metadata:", error);
      return null;
    }
  }
}
