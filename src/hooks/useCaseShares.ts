import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';

interface SharedCase {
  case_id: string;
  title: string;
  category: string;
  created_at: string;
  shared_at: string;
  side_a_username: string;
  side_a_avatar: string | null;
}

interface SharedCasesResponse {
  cases: SharedCase[];
  total: number;
}

interface UseCaseSharesReturn {
  sharedCases: SharedCase[];
  total: number;
  isShared: boolean;
  isLoading: boolean;
  fetchSharedCases: (skip?: number, take?: number) => Promise<void>;
  toggleShare: (caseId: string) => Promise<boolean | undefined>;
  checkShared: (caseId: string) => Promise<void>;
  getShareCount: (caseId: string) => Promise<number>;
}

export function useCaseShares(): UseCaseSharesReturn {
  const [sharedCases, setSharedCases] = useState<SharedCase[]>([]);
  const [total, setTotal] = useState(0);
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSharedCases = useCallback(async (skip: number = 0, take: number = 20) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.get(
        `/saved-cases/shared?skip=${skip}&take=${take}`
      ) as any;
      setSharedCases(data.cases);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching shared cases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleShare = useCallback(async (caseId: string) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.post(
        `/saved-cases/${caseId}/share`,
        {}
      ) as any;
      
      const shared = data.shared ?? data.is_shared ?? data.isShared;
      setIsShared(shared);
      
      if (shared && (data.caseResponse || data.case || data.sharedCase)) {
        const mappedCase = data.caseResponse || data.case || data.sharedCase;
        setSharedCases(prev => [mappedCase, ...prev]);
        setTotal(prev => prev + 1);
      } else {
        setSharedCases(prev => prev.filter(c => c.case_id !== caseId));
        setTotal(prev => prev - 1);
      }
      return shared;
    } catch (error) {
      console.error('Error toggling share:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkShared = useCallback(async (caseId: string) => {
    if (!authStorage.isAuthenticated()) return;

    try {
      const data = await apiClient.get(`/saved-cases/${caseId}/shared`) as any;
      setIsShared(data.shared);
    } catch (error) {
      console.error('Error checking shared status:', error);
    }
  }, []);

  const getShareCount = useCallback(async (caseId: string) => {
    try {
      const data = await apiClient.get(`/saved-cases/${caseId}/shares`) as any;
      return data.shares || 0;
    } catch (error) {
      console.error('Error getting share count:', error);
      return 0;
    }
  }, []);

  return {
    sharedCases,
    total,
    isShared,
    isLoading,
    fetchSharedCases,
    toggleShare,
    checkShared,
    getShareCount,
  };
}
