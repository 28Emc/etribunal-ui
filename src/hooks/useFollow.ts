import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';

interface UseFollowReturn {
  following: boolean;
  loading: boolean;
  error: string | null;
  toggleFollow: (username: string) => Promise<boolean>;
}

export function useFollow(): UseFollowReturn {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFollow = useCallback(async (username: string): Promise<boolean> => {
    if (!authStorage.isAuthenticated()) return following;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.post(`/users/${username}/follow`, {}) as any;
      setFollowing(result.following);
      return result.following;
    } catch (err: any) {
      setError(err.message || 'Error toggling follow');
      return following;
    } finally {
      setLoading(false);
    }
  }, [following]);

  return {
    following,
    loading,
    error,
    toggleFollow
  };
}
