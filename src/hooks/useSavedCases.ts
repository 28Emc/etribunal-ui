import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';

interface SavedCase {
  case_id: string;
  title: string;
  category: string;
  created_at: string;
  side_a_username: string;
  side_a_avatar: string | null;
}

interface SavedCasesResponse {
  cases: SavedCase[];
  total: number;
}

interface UseSavedCasesReturn {
  savedCases: SavedCase[];
  total: number;
  isSaved: boolean;
  isLoading: boolean;
  fetchSavedCases: (skip?: number, take?: number) => Promise<void>;
  toggleSave: (caseId: string) => Promise<{ saved: boolean; anchorsCount: number } | undefined>;
  checkSaved: (caseId: string) => Promise<void>;
}

export function useSavedCases(): UseSavedCasesReturn {
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [total, setTotal] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSavedCases = useCallback(async (skip: number = 0, take: number = 20) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
       const data = await apiClient.get(
          `/saved-cases?skip=${skip}&take=${take}`
        ) as any;
      setSavedCases(data.cases);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching saved cases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleSave = useCallback(async (caseId: string) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.post(
        `/cases/${caseId}/save`,
        {}
      ) as any;
      
      const saved = data.saved;
      const anchorsCount = data.total_anchors;
      setIsSaved(saved);
      return { saved, anchorsCount };
    } catch (error) {
      console.error('Error toggling save:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSaved = useCallback(async (caseId: string) => {
    if (!authStorage.isAuthenticated()) return;

    try {
      const data = await apiClient.get(`/cases/${caseId}/saved`) as any;
      setIsSaved(data.saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  }, []);

  return {
    savedCases,
    total,
    isSaved,
    isLoading,
    fetchSavedCases,
    toggleSave,
    checkSaved,
  };
}
