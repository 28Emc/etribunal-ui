import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';
import type { Case, CaseType } from '@typings/index';

interface CreateCaseData {
  title: string;
  category: string;
  type: CaseType;
  sideAStory: string;
  sideBUsername?: string;
  imagesA?: File[];
}

interface UseCreateCaseReturn {
  creating: boolean;
  error: string | null;
  createCase: (data: CreateCaseData) => Promise<Case | null>;
}

export function useCreateCase(): UseCreateCaseReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCase = useCallback(async (data: CreateCaseData): Promise<Case | null> => {
    if (!authStorage.isAuthenticated()) return null;
    
    setCreating(true);
    setError(null);
    
    try {
      const payload: any = {
        title: data.title,
        category: data.category,
        type: data.type,
        side_a: {
          story: data.sideAStory,
        },
      };
      
      if (data.type === 'vote' && data.sideBUsername) {
        payload.side_b_username = data.sideBUsername;
      }
      
      const createdCase = await apiClient.post('/cases', payload) as any;
      return createdCase;
    } catch (err: any) {
      setError(err.message || 'Error creating case');
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    creating,
    error,
    createCase
  };
}
