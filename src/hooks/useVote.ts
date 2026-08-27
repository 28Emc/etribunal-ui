import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';
import { useAuth } from '@context/AuthContext';

interface VoteResponse {
  case_id: string;
  vote_type: 'A' | 'B' | 'BOTH_WRONG' | null;
  votes_a: number;
  votes_b: number;
  votes_both_wrong: number;
}

interface UseVoteReturn {
  vote: 'A' | 'B' | 'BOTH_WRONG' | null;
  votesA: number;
  votesB: number;
  votesBothWrong: number;
  isLoading: boolean;
  voteForCase: (caseId: string, voteType: 'A' | 'B' | 'BOTH_WRONG') => Promise<VoteResponse | undefined>;
  removeVote: (caseId: string) => Promise<VoteResponse | undefined>;
  fetchVote: (caseId: string) => Promise<void>;
}

export function useVote(): UseVoteReturn {
  const { currentUser } = useAuth();
  const [vote, setVote] = useState<'A' | 'B' | 'BOTH_WRONG' | null>(null);
  const [votesA, setVotesA] = useState(0);
  const [votesB, setVotesB] = useState(0);
  const [votesBothWrong, setVotesBothWrong] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVote = useCallback(async (caseId: string) => {
    if (!authStorage.isAuthenticated()) return;

    try {
      const data = await apiClient.get(`/cases/${caseId}/votes`) as any;
      setVote(data.vote_type);
      setVotesA(data.votes_a);
      setVotesB(data.votes_b);
      setVotesBothWrong(data.votes_both_wrong);
    } catch (error) {
      console.error('Error fetching vote:', error);
    }
  }, []);

  const voteForCase = useCallback(async (caseId: string, voteType: 'A' | 'B' | 'BOTH_WRONG') => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.post(`/cases/${caseId}/votes`, { vote_type: voteType }) as any;
      setVote(data.vote_type);
      setVotesA(data.votes_a);
      setVotesB(data.votes_b);
      setVotesBothWrong(data.votes_both_wrong);
      
      // Update local storage so all components know the user voted
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          votes: {
            ...(currentUser as any).votes,
            [caseId]: voteType
          }
        };
        localStorage.setItem('etribunal_user', JSON.stringify(updatedUser));
      }
      
      return data;
    } catch (error) {
      console.error('Error voting:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const removeVote = useCallback(async (caseId: string) => {
    if (!authStorage.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const data = await apiClient.delete(`/cases/${caseId}/votes`) as any;
      setVote(data.vote_type);
      setVotesA(data.votes_a);
      setVotesB(data.votes_b);
      setVotesBothWrong(data.votes_both_wrong);

      // Update local storage
      if (currentUser) {
        const newVotes = { ...(currentUser as any).votes };
        delete newVotes[caseId];
        const updatedUser = {
          ...currentUser,
          votes: newVotes
        };
        localStorage.setItem('etribunal_user', JSON.stringify(updatedUser));
      }

      return data;
    } catch (error) {
      console.error('Error removing vote:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  return {
    vote,
    votesA,
    votesB,
    votesBothWrong,
    isLoading,
    voteForCase,
    removeVote,
    fetchVote,
  };
}
