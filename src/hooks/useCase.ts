import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';
import type { Case } from '@typings/index';

interface UseCaseReturn {
  caseData: Case | null;
  loading: boolean;
  error: string | null;
  fetchCase: (caseId: string) => Promise<Case | null>;
}

export function useCase(): UseCaseReturn {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async (caseId: string): Promise<Case | null> => {
    if (!authStorage.isAuthenticated()) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get(`/cases/${caseId}`) as unknown as Case;
      setCaseData(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error fetching case');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    caseData,
    loading,
    error,
    fetchCase
  };
}
