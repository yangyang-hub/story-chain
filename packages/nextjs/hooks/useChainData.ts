import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyticsData, ChapterData, StoryData } from "~~/lib/monitoring/types";
import chainDataService, { ChapterFilters, PaginatedResponse, StoryFilters } from "~~/services/chain/chainDataService";

interface UseAsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAsyncDataOptions {
  immediate?: boolean;
  dependencies?: React.DependencyList;
}

// 通用的异步数据获取Hook
function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions = { immediate: true, dependencies: [] },
): UseAsyncDataState<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: options.immediate !== false,
    error: null,
  });

  // 使用 useRef 来存储 fetcher，避免依赖问题
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcherRef.current();
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }, []); // 不依赖 fetcher

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (options.immediate) {
      fetchData();
    }
  }, [fetchData, ...(options.dependencies || [])]);

  return { ...state, refetch };
}

// Stories相关Hooks
export function useStories(filters?: StoryFilters, options?: UseAsyncDataOptions) {
  return useAsyncData<PaginatedResponse<StoryData>>(() => chainDataService.getStories(filters), {
    immediate: true, // 确保immediate为true
    ...options,
    dependencies: [JSON.stringify(filters), ...(options?.dependencies || [])],
  });
}

export function useStoryById(id: string, options?: UseAsyncDataOptions) {
  return useAsyncData<StoryData | null>(() => chainDataService.getStoryById(id), {
    ...options,
    dependencies: [id, ...(options?.dependencies || [])],
  });
}

export function useStoriesByAuthor(
  author: string,
  pagination?: { page?: number; limit?: number },
  options?: UseAsyncDataOptions,
) {
  return useAsyncData<PaginatedResponse<StoryData>>(() => chainDataService.getStoriesByAuthor(author, pagination), {
    ...options,
    dependencies: [author, JSON.stringify(pagination), ...(options?.dependencies || [])],
  });
}

// Chapters相关Hooks
export function useChapters(filters?: ChapterFilters, options?: UseAsyncDataOptions) {
  return useAsyncData<PaginatedResponse<ChapterData>>(() => chainDataService.getChapters(filters), {
    ...options,
    dependencies: [JSON.stringify(filters), ...(options?.dependencies || [])],
  });
}

export function useChapterById(id: string, options?: UseAsyncDataOptions) {
  return useAsyncData<ChapterData | null>(() => chainDataService.getChapterById(id), {
    ...options,
    dependencies: [id, ...(options?.dependencies || [])],
  });
}

export function useChaptersByStory(
  storyId: string,
  pagination?: { page?: number; limit?: number },
  options?: UseAsyncDataOptions,
) {
  return useAsyncData<PaginatedResponse<ChapterData>>(() => chainDataService.getChaptersByStory(storyId, pagination), {
    ...options,
    dependencies: [storyId, JSON.stringify(pagination), ...(options?.dependencies || [])],
  });
}

export function useChaptersByParent(
  parentId: string,
  pagination?: { page?: number; limit?: number },
  options?: UseAsyncDataOptions,
) {
  return useAsyncData<PaginatedResponse<ChapterData>>(
    () => chainDataService.getChaptersByParent(parentId, pagination),
    { ...options, dependencies: [parentId, JSON.stringify(pagination), ...(options?.dependencies || [])] },
  );
}

// Analytics相关Hooks
export function useAnalytics(options?: UseAsyncDataOptions) {
  return useAsyncData<AnalyticsData>(() => chainDataService.getAnalytics(), options);
}

// 数据同步相关Hooks
export function useDataSync() {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const triggerSync = useCallback(async (fromBlock?: string) => {
    setSyncing(true);
    setSyncError(null);
    try {
      await chainDataService.triggerDataSync(fromBlock);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { triggerSync, syncing, syncError };
}

// 监控状态Hook
export function useMonitorStatus(options?: UseAsyncDataOptions) {
  return useAsyncData<any>(() => chainDataService.getMonitorStatus(), {
    ...options,
    dependencies: [...(options?.dependencies || [])],
  });
}

// 组合Hook：用于页面级数据获取
export function useStoryPageData(storyId: string) {
  const storyQuery = useStoryById(storyId);
  const chaptersQuery = useChaptersByStory(storyId);

  const loading = storyQuery.loading || chaptersQuery.loading;
  const error = storyQuery.error || chaptersQuery.error;

  const refetch = useCallback(async () => {
    await Promise.all([storyQuery.refetch(), chaptersQuery.refetch()]);
  }, [storyQuery.refetch, chaptersQuery.refetch]);

  return {
    story: storyQuery.data,
    chapters: chaptersQuery.data?.data || [],
    pagination: chaptersQuery.data?.pagination,
    loading,
    error,
    refetch,
  };
}

// 实时数据刷新Hook
export function useRealTimeData() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshAll = useCallback(() => {
    chainDataService.clearCache();
    setLastUpdate(new Date());
  }, []);

  // 监听窗口焦点，当重新获得焦点时刷新数据
  useEffect(() => {
    const handleFocus = () => {
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();
      // 如果超过1分钟，则刷新数据
      if (timeDiff > 60000) {
        refreshAll();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastUpdate, refreshAll]);

  return { refreshAll, lastUpdate };
}

// 缓存管理Hook
export function useCacheManagement() {
  const clearCache = useCallback(() => {
    chainDataService.clearCache();
  }, []);

  const clearCacheByPattern = useCallback((pattern: string) => {
    chainDataService.clearCacheByPattern(pattern);
  }, []);

  const preloadData = useCallback(async () => {
    await chainDataService.preloadData();
  }, []);

  return { clearCache, clearCacheByPattern, preloadData };
}
