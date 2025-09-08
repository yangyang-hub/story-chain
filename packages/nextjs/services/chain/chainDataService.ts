import { AnalyticsData, ChapterData, StoryData } from "~~/lib/monitoring/types";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface StoryFilters extends PaginationParams {
  author?: string;
  sortBy?: "createdTime" | "likes" | "totalTips" | "forkCount";
  sortOrder?: "asc" | "desc";
}

export interface ChapterFilters extends PaginationParams {
  storyId?: string;
  author?: string;
  parentId?: string;
  sortBy?: "createdTime" | "likes" | "totalTips" | "chapterNumber";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class ChainDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 30000; // 30 seconds cache timeout

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchWithCache<T>(url: string, cacheKey?: string): Promise<T> {
    const key = cacheKey || url;
    const cached = this.getCachedData<T>(key);
    if (cached) {
      return cached;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const data: T = await response.json();
    this.setCachedData(key, data);
    return data;
  }

  async getStories(filters: StoryFilters = {}): Promise<PaginatedResponse<StoryData>> {
    const queryString = this.buildQueryString(filters);
    const url = `/api/data/stories?${queryString}`;
    
    const response = await this.fetchWithCache<{ stories: StoryData[]; pagination: any }>(url);
    
    return {
      data: response.stories,
      pagination: response.pagination,
    };
  }

  async getChapters(filters: ChapterFilters = {}): Promise<PaginatedResponse<ChapterData>> {
    const queryString = this.buildQueryString(filters);
    const url = `/api/data/chapters?${queryString}`;
    
    const response = await this.fetchWithCache<{ chapters: ChapterData[]; pagination: any }>(url);
    return {
      data: response.chapters,
      pagination: response.pagination,
    };
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const url = "/api/data/analytics";
    const response = await this.fetchWithCache<{ analytics: AnalyticsData }>(url);
    return response.analytics;
  }

  async getStoryById(id: string): Promise<StoryData | null> {
    const url = `/api/data/stories/${id}`;
    try {
      const response = await this.fetchWithCache<{ story: StoryData }>(url);
      return response.story;
    } catch (error) {
      // 如果API返回404，返回null而不是抛出错误
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async getChapterById(id: string): Promise<ChapterData | null> {
    const url = `/api/data/chapters/${id}`;
    try {
      const response = await this.fetchWithCache<{ chapter: ChapterData }>(url);
      return response.chapter;
    } catch (error) {
      // 如果API返回404，返回null而不是抛出错误
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async getStoriesByAuthor(author: string, options: PaginationParams = {}): Promise<PaginatedResponse<StoryData>> {
    return this.getStories({ ...options, author });
  }

  async getChaptersByStory(storyId: string, options: PaginationParams = {}): Promise<PaginatedResponse<ChapterData>> {
    return this.getChapters({ ...options, storyId });
  }

  async getChaptersByParent(parentId: string, options: PaginationParams = {}): Promise<PaginatedResponse<ChapterData>> {
    return this.getChapters({ ...options, parentId });
  }

  // 触发数据同步
  async triggerDataSync(fromBlock?: string): Promise<{ success: boolean; message: string }> {
    const url = `/api/data/sync${fromBlock ? `?fromBlock=${fromBlock}` : ""}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      // 清除缓存，强制下次获取最新数据
      this.clearCache();
      
      return await response.json();
    } catch (error) {
      console.error("Failed to trigger data sync:", error);
      throw error;
    }
  }

  // 获取监控状态
  async getMonitorStatus(): Promise<any> {
    const response = await fetch("/api/data/sync");
    if (!response.ok) {
      throw new Error(`Failed to get monitor status: ${response.status}`);
    }
    return response.json();
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
  }

  // 清除特定缓存
  clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // 预热缓存
  async preloadData(): Promise<void> {
    try {
      await Promise.all([
        this.getStories({ limit: 20 }),
        this.getChapters({ limit: 20 }),
        this.getAnalytics(),
      ]);
    } catch (error) {
      console.warn("Failed to preload data:", error);
    }
  }
}

// 创建单例实例
export const chainDataService = new ChainDataService();

// 自动预热缓存（仅在浏览器环境）
if (typeof window !== "undefined") {
  // 延迟预热，避免阻塞初始渲染
  setTimeout(() => {
    chainDataService.preloadData();
  }, 1000);
}

export default chainDataService;