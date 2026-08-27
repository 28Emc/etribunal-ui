import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';
import type { Case, FeedTab } from '@typings/index';
import { mapDbCaseToCase } from '@shared/utils/caseMapper';

interface UseCasesReturn {
  cases: Case[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  fetchCases: (skip?: number, tab?: FeedTab, category?: string, query?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshCases: () => Promise<void>;
  updateCase: (caseId: string, updates: Partial<Case> | ((prev: Case) => Case)) => void;
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
}

export function useCases(): UseCasesReturn {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skipData, setSkipData] = useState(0);
  const [lastParams, setLastParams] = useState<{tab: FeedTab; category: string; query: string}>({
    tab: 'for_you',
    category: 'All',
    query: ''
  });

  const fetchCases = useCallback(async (
    resetSkip: number = 0,
    tab: FeedTab = 'for_you',
    category: string = 'All',
    query: string = ''
  ) => {
    setIsLoading(true);
    setError(null);
    setLastParams({ tab, category, query });
    
    try {
      const params = new URLSearchParams({
        skip: String(resetSkip),
        take: '20',
        feedType: tab,
        category: category !== 'All' ? category : '',
        q: query
      });
      
      const data = await apiClient.get(`/cases?${params}`) as any;
      const currentUserId = authStorage.getUserId();
      const mappedData = data.map((c: any) => mapDbCaseToCase(c, currentUserId ?? undefined));
      
      setCases(mappedData);
      setHasMore(mappedData.length === 20);
      setSkipData(resetSkip + (mappedData.length || 20));
    } catch (err: any) {
      setCases([]);
      setHasMore(false);
      setSkipData(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    const currentSkip = skipData;
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        skip: String(currentSkip),
        take: '20',
        feedType: lastParams.tab,
        category: lastParams.category !== 'All' ? lastParams.category : '',
        q: lastParams.query
      });
      
      const data = await apiClient.get(`/cases?${params}`) as any;
      const currentUserId = authStorage.getUserId();
      const mappedData = data.map((c: any) => mapDbCaseToCase(c, currentUserId ?? undefined));
      
      const newCasesCount = mappedData.length;
      const updatedCases = [...cases, ...mappedData];
      setCases(updatedCases);
      setSkipData(currentSkip + newCasesCount);
      setHasMore(newCasesCount === 20);
    } catch (err: any) {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, skipData, lastParams, cases]);

  const refreshCases = useCallback(async () => {
    if (isLoading) return;
    await fetchCases(0, lastParams.tab, lastParams.category, lastParams.query);
  }, [isLoading, fetchCases, lastParams]);

  const updateCase = useCallback((caseId: string, updates: Partial<Case> | ((prev: Case) => Case)) => {
    setCases(prev => {
      const updated = prev.map(c => {
        if (c.id !== caseId) return c;
        return typeof updates === 'function' ? updates(c) : { ...c, ...updates };
      });
      return [...updated];
    });
  }, []);

  return {
    cases,
    isLoading,
    hasMore,
    error,
    fetchCases,
    loadMore,
    refreshCases,
    updateCase,
    setCases
  };
}
