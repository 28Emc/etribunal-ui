import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient, authStorage } from '@api/client';
import type { UserSearchResult } from '@typings/index';

interface UseSearchUsersReturn {
  results: UserSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

export function useSearchUsers(): UseSearchUsersReturn {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length < 2 || !authStorage.isAuthenticated()) {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiClient.get(
          `/users/search?q=${encodeURIComponent(query)}&take=8`
        ) as any;
        setResults(data);
      } catch (err: any) {
        setError(err.message || 'Error searching users');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
}
