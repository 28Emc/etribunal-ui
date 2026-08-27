import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';

interface ReactionCount {
  emoji: string;
  count: number;
}

interface ReactionsSummary {
  reactions: ReactionCount[];
  user_reaction: string | null;
}

interface UseReactionsReturn {
  reactions: ReactionsSummary | null;
  isLoading: boolean;
  fetchReactions: (targetType: 'CASE' | 'COMMENT', targetId: string) => Promise<void>;
  toggleReaction: (targetType: 'CASE' | 'COMMENT', targetId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => Promise<ReactionsSummary | undefined>;
}

export function useReactions(): UseReactionsReturn {
  const [reactions, setReactions] = useState<ReactionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReactions = useCallback(async (targetType: 'CASE' | 'COMMENT', targetId: string) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.get(
        `/reactions?target_type=${targetType}&target_id=${targetId}`
      ) as any;
      setReactions(data);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleReaction = useCallback(async (
    targetType: 'CASE' | 'COMMENT',
    targetId: string,
    emoji: 'LIKE' | 'LOVE' | 'ANGRY'
  ) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.post('/reactions', {
        target_type: targetType,
        target_id: targetId,
        emoji,
      }) as any;
      setReactions(data);
      return data;
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    reactions,
    isLoading,
    fetchReactions,
    toggleReaction,
  };
}
