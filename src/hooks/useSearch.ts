import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, authStorage } from '@api/client';
import { useDebounce } from './useDebounce';

export interface UserSearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_following?: boolean;
}

export interface CaseSearchResult {
  id: string;
  title: string;
  category: string;
  status: string;
  side_a_user: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_anonymous: boolean;
  };
  side_b_user: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_anonymous: boolean;
  } | null;
  votes_a: number;
  votes_b: number;
  votes_both_wrong: number;
  total_votes: number;
  total_comments: number;
  created_at: string;
  images?: { id: string; url: string }[];
}

export interface SearchResults {
  users: UserSearchResult[];
  cases: CaseSearchResult[];
  hasMore: boolean;
}

interface UseSearchOptions {
  minChars?: number;
  debounceMs?: number;
  defaultType?: 'ALL' | 'CASES' | 'USERS';
}

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  searchType: 'ALL' | 'CASES' | 'USERS';
  setSearchType: (t: 'ALL' | 'CASES' | 'USERS') => void;
  results: SearchResults;
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  hasMore: boolean;
  search: () => void;
  clearResults: () => void;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { minChars = 2, debounceMs = 500, defaultType = 'ALL' } = options;

  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<'ALL' | 'CASES' | 'USERS'>(defaultType);
  const [results, setResults] = useState<SearchResults>({ users: [], cases: [], hasMore: false });
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!authStorage.isAuthenticated()) return;
    
    try {
      const following = await apiClient.get('/users/me/following?take=10') as any;
      if (following?.following) {
        setResults(prev => ({
          ...prev,
          users: following.following.map((u: any) => ({
            id: u.id,
            username: u.username,
            avatar_url: u.avatar_url,
            bio: u.bio,
            is_following: true
          }))
        }));
      }
    } catch (err) {
      console.error('Error fetching following:', err);
    }
  }, []);

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      fetchFollowing();
    }
  }, [fetchFollowing]);

  const performSearch = useCallback(async (searchQuery: string, type: 'ALL' | 'CASES' | 'USERS') => {
    if (searchQuery.trim().length < minChars) {
      if (searchQuery.trim().length === 0) {
        fetchFollowing();
      } else {
        setResults({ users: [], cases: [], hasMore: false });
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);
    setHasSearched(false);

    try {
      const data = await apiClient.get(
        `/search/advanced?q=${encodeURIComponent(searchQuery)}&type=${type}&take=10`
      ) as any;
      setResults({
        users: data.users || [],
        cases: data.cases || [],
        hasMore: data.hasMore || false,
      });
      setHasSearched(true);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Search error:', err);
        setError(err.message || 'Error en la búsqueda');
        setResults({ users: [], cases: [], hasMore: false });
      }
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [minChars, fetchFollowing]);

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim();
    
    if (normalizedQuery.length < minChars) {
      if (normalizedQuery.length === 0 && authStorage.isAuthenticated()) {
        fetchFollowing();
      } else {
        setResults({ users: [], cases: [], hasMore: false });
      }
      return;
    }

    performSearch(normalizedQuery, searchType);
  }, [debouncedQuery, searchType, performSearch, minChars, fetchFollowing]);

  const search = useCallback(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length >= minChars) {
      performSearch(normalizedQuery, searchType);
    }
  }, [query, searchType, performSearch, minChars]);

  const clearResults = useCallback(() => {
    setQuery("");
    setResults({ users: [], cases: [], hasMore: false });
    setError(null);
    fetchFollowing();
  }, [fetchFollowing]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    searchType,
    setSearchType,
    results,
    isSearching,
    hasSearched,
    error,
    hasMore: results.hasMore,
    search,
    clearResults,
  };
}
