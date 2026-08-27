import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, authStorage } from '@api/client';
import { formatRelativeCaseDate } from '@utils/helpers';
import type { ReactionType } from '@typings/index';

interface Comment {
  id: string;
  user: string;
  userId?: string;
  avatar: string;
  text: string;
  timestamp: string; // For display (relative date)
  createdAt: string; // Raw ISO date for API calls
  replies?: Comment[];
  userReaction?: ReactionType | null;
  reactions: { LIKE: number; LOVE: number; ANGRY: number };
  replies_count?: number;
  reactions_count?: number;
  isOwner?: boolean;
  contentLanguage?: string;
}

const mapDbCommentToComment = (dbComment: any, currentUserId?: string): Comment => {
  const reactionsMap: Record<string, number> = { LIKE: 0, LOVE: 0, ANGRY: 0 };
  let userReaction: ReactionType | null = null;

  if (dbComment.reactions && Array.isArray(dbComment.reactions)) {
    for (const r of dbComment.reactions) {
      reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
      if (currentUserId && r.user_id === currentUserId) {
        userReaction = r.emoji as ReactionType;
      }
    }
  }

  const commentUserId = dbComment.user?.id;
  
  // Ensure we have a valid ISO date string for API calls
  let rawDate = dbComment.created_at;
  if (rawDate instanceof Date) {
    rawDate = rawDate.toISOString();
  } else if (typeof rawDate === 'string') {
    // Validate it's a proper ISO date
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      rawDate = dateObj.toISOString();
    } else {
      // Fallback to current time if invalid
      rawDate = new Date().toISOString();
    }
  } else {
    rawDate = new Date().toISOString();
  }

  return {
    id: dbComment.id,
    user: dbComment.user?.username || 'Anonymous',
    userId: commentUserId,
    avatar: dbComment.user?.avatar_url || 'https://picsum.photos/seed/user123/100/100',
    text: dbComment.content,
    timestamp: formatRelativeCaseDate(dbComment.created_at), // For display
    createdAt: rawDate, // Raw ISO date for API
    userReaction: dbComment.user_reaction || userReaction,
    reactions: dbComment.reactions_summary?.counts || reactionsMap,
    replies_count: dbComment.replies_count || 0,
    reactions_count: dbComment.reactions_count || dbComment.reactions?.length || 0,
    contentLanguage: dbComment.content_language || undefined,
    replies: dbComment.replies ? dbComment.replies.map((r: any) => mapDbCommentToComment(r, currentUserId)) : [],
    isOwner: !!currentUserId && commentUserId === currentUserId
  };
};

interface CommentCursorDto {
  before?: string; // Cursor for older comments (ISO date string)
  after?: string; // Cursor for newer comments (ISO date string)
  limit?: number;
}

interface CommentsCursorResponse {
  data: Comment[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseCommentsReturn {
  // State
  visibleComments: Comment[];
  pendingComments: Comment[];
  pendingCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  isFetching: boolean;
  isPollingEnabled: boolean;
  error: string | null;
  
  // Actions
  fetchInitialComments: (caseId: string) => Promise<void>;
  fetchOlderComments: (caseId: string) => Promise<void>;
  checkForNewComments: (caseId: string) => Promise<number>;
  addComment: (caseId: string, content: string, parentId?: string) => Promise<Comment | undefined>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  fetchReplies: (commentId: string) => Promise<Comment[]>;
  
  // UI Actions
  showNewComments: () => void;
  hideNewCommentsIndicator: () => void;
}

export function useComments(): UseCommentsReturn {
  const [visibleComments, setVisibleComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for polling and scroll position
  const lastPollTimeRef = useRef<number>(0);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const caseIdRef = useRef<string | null>(null);
  const pendingSinceRef = useRef<string | null>(null);
  const newestVisibleTimestampRef = useRef<string | null>(null);
  
  // Map comment IDs to prevent duplicates
  const commentIdsRef = useRef<Set<string>>(new Set());

  // Initialize comment IDs from visible comments
  useEffect(() => {
    const ids = new Set(visibleComments.map(c => c.id));
    commentIdsRef.current = ids;
  }, [visibleComments]);

  // Update comment IDs when pending comments change
  useEffect(() => {
    const ids = new Set([
      ...visibleComments.map(c => c.id),
      ...pendingComments.map(c => c.id)
    ]);
    commentIdsRef.current = ids;
  }, [visibleComments, pendingComments]);

  // Track the timestamp of the newest visible comment for polling
  // Only update if the new timestamp is MORE RECENT (higher) than current
  // This prevents the ref from being reset to an older timestamp
  useEffect(() => {
    if (visibleComments.length > 0 && visibleComments[0].createdAt) {
      const newTimestamp = visibleComments[0].createdAt;
      const currentTimestamp = newestVisibleTimestampRef.current;
      
      // Only update if the new timestamp is more recent
      if (!currentTimestamp || new Date(newTimestamp) > new Date(currentTimestamp)) {
        newestVisibleTimestampRef.current = newTimestamp;
      }
    }
  }, [visibleComments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

const fetchInitialComments = useCallback(async (caseId: string) => {
    caseIdRef.current = caseId;
    setIsFetching(true);
    setError(null);
    
    try {
        // Reset state
        setVisibleComments([]);
        setPendingComments([]);
        setPendingCount(0);
        setHasMore(true);
        setNextCursor(null);
        commentIdsRef.current.clear();
        newestVisibleTimestampRef.current = null;
        pendingSinceRef.current = null;
        
        // Fetch initial batch (newest comments)
        const result = await apiClient.get(
            `/cases/${caseId}/comments?limit=20`
        ) as any;
        
        const currentUserId = authStorage.getUserId() ?? undefined;
        const mappedComments = result.data.map((c: any) => mapDbCommentToComment(c, currentUserId));
        
        // Update state
        setVisibleComments(mappedComments);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
        
        // Update comment IDs
        mappedComments.forEach((comment: any) => commentIdsRef.current.add(comment.id));
        
        // Set last poll time to now for new comments detection
        lastPollTimeRef.current = Date.now();
        
        // Start polling
        startPolling(caseId);
    } catch (err: any) {
        setError(err.message || 'Error fetching initial comments');
    } finally {
        setIsFetching(false);
    }
}, []);
  
  const fetchOlderComments = useCallback(async (caseId: string) => {
    if (!hasMore || isFetching || !nextCursor) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
// Fetch older comments using the cursor
        const result = await apiClient.get(
             `/cases/${caseId}/comments?before=${nextCursor}&limit=20`
         ) as any;
      
      const currentUserId = authStorage.getUserId() ?? undefined;
      const mappedComments = result.data.map((c: any) => mapDbCommentToComment(c, currentUserId));
      
      // Filter out duplicates
      const newComments = mappedComments.filter(
        (comment: any) => !commentIdsRef.current.has(comment.id)
      );
      
      // Update state - prepend to maintain chronological order (newest first)
      setVisibleComments(prev => [...newComments, ...prev]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      
      // Update comment IDs
      newComments.forEach((comment: any) => commentIdsRef.current.add(comment.id));
    } catch (err: any) {
      setError(err.message || 'Error fetching older comments');
    } finally {
      setIsFetching(false);
    }
  }, [hasMore, isFetching, nextCursor]);
  
  const checkForNewComments = useCallback(async (caseId: string): Promise<number> => {
    if (!isPollingEnabled) return 0;
    
    // Don't poll if there are pending comments waiting to be shown
    if (pendingCount > 0) {
      return 0;
    }
    
    try {
      // Get the newest visible comment's timestamp for polling
      // This is the first comment in the array (newest first)
      const sinceTimestamp = newestVisibleTimestampRef.current || visibleComments[0]?.createdAt;
      if (!sinceTimestamp) {
        return 0;
      }
      
      // Validate the date before using it
      const sinceDate = new Date(sinceTimestamp);
      if (isNaN(sinceDate.getTime())) {
        console.warn('[checkForNewComments] Invalid date in sinceTimestamp:', sinceTimestamp);
        return 0;
      }
      
      // Build URL with query string manually to ensure proper formatting
      const since = encodeURIComponent(sinceTimestamp);
      const url = `/cases/${caseId}/comments/new?since=${since}`;
      const result = await apiClient.get(url) as any;
      
      const newCount = result.count;
      
      if (newCount > 0) {
        // Store the since date and count for when user clicks the button
        // Use pendingSinceRef to track which timestamp to use for fetching
        pendingSinceRef.current = sinceTimestamp;
        setPendingCount(newCount);
        
        // CRITICAL: Stop polling until user clicks the button
        // The polling will be restarted in showNewComments after comments are loaded
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        // Clear any existing pending
        setPendingCount(0);
        pendingSinceRef.current = null;
      }
      
      return newCount;
    } catch (err: any) {
      console.error('Error checking for new comments:', err);
      return 0;
    }
  }, [visibleComments, isPollingEnabled, pendingCount]);
  
  const addComment = useCallback(async (caseId: string, content: string, parentId?: string) => {
    if (!authStorage.isAuthenticated()) return undefined;
    
    try {
      const data = await apiClient.post(
        `/cases/${caseId}/comments`, 
        { 
          content,
          ...(parentId && { parent_id: parentId }),
        }
      ) as any;
      
      const currentUserId = authStorage.getUserId() ?? undefined;
      const mappedComment = mapDbCommentToComment(data, currentUserId);
      
      // Optimistic update - add to visible comments at the beginning
      setVisibleComments(prev => [mappedComment, ...prev]);
      commentIdsRef.current.add(mappedComment.id);
      
      // If this is a reply, we might need to fetch the parent to update its replies count
      // For simplicity, we'll refetch the comments to get accurate state
      if (parentId) {
        // Refetch to get updated state including replies count
        await fetchInitialComments(caseId);
      }
      
      return mappedComment;
    } catch (err: any) {
      setError(err.message || 'Error adding comment');
      throw err;
    }
  }, []);
  
  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!authStorage.isAuthenticated()) return;
    
    try {
      const data = await apiClient.put(
        `/comments/${commentId}`, 
        { content }
      ) as any;
      
      const currentUserId = authStorage.getUserId() ?? undefined;
      const updatedComment = mapDbCommentToComment(data, currentUserId);
      
      // Update in visible comments
      setVisibleComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        )
      );
      
      // Update in pending comments if exists
      setPendingComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        )
      );
    } catch (err: any) {
      setError(err.message || 'Error updating comment');
      throw err;
    }
  }, []);
  
  const deleteComment = useCallback(async (commentId: string) => {
    if (!authStorage.isAuthenticated()) return;
    
    try {
      await apiClient.delete(`/comments/${commentId}`);
      
      // Remove from visible comments
      setVisibleComments(prev => 
        prev.filter(comment => comment.id !== commentId)
      );
      commentIdsRef.current.delete(commentId);
      
      // Remove from pending comments
      setPendingComments(prev => 
        prev.filter(comment => comment.id !== commentId)
      );
      commentIdsRef.current.delete(commentId);
    } catch (err: any) {
      setError(err.message || 'Error deleting comment');
      throw err;
    }
  }, []);
  
  const fetchReplies = useCallback(async (commentId: string): Promise<Comment[]> => {
    try {
      const data = await apiClient.get(`/comments/${commentId}/replies`) as any;
      const currentUserId = authStorage.getUserId() ?? undefined;
      return data.map((c: any) => mapDbCommentToComment(c, currentUserId));
    } catch (err: any) {
      console.error('Error fetching replies:', err);
      return [];
    }
  }, []);
  
  const startPolling = useCallback((caseId: string) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Set up polling every 15 seconds
    pollIntervalRef.current = setInterval(async () => {
      // Don't poll if tab is hidden or user is inactive
      if (document.visibilityState !== 'visible') return;
      
      const newCount = await checkForNewComments(caseId);
      // Note: The UI will show the indicator based on pendingComments length
    }, 15000);
  }, [checkForNewComments]);
  
  const showNewComments = useCallback(async () => {
    // Fetch the actual new comments using the stored since date
    if (!caseIdRef.current || !pendingSinceRef.current) {
      // No pending comments to show
      return;
    }
    
    const sinceDate = pendingSinceRef.current;
    
    try {
      // Fetch new comments using the stored timestamp
      const result = await apiClient.get(
        `/cases/${caseIdRef.current}/comments?after=${encodeURIComponent(sinceDate)}&limit=50`
      ) as any;
      
      const currentUserId = authStorage.getUserId() ?? undefined;
      const newComments = result.data.map((c: any) => 
        mapDbCommentToComment(c, currentUserId)
      ).filter(
        (comment: any) => !commentIdsRef.current.has(comment.id)
      );
      
      // Add to visible comments at the beginning (newest first)
      setVisibleComments(prev => [...newComments, ...prev]);
      
      // Update comment IDs
      newComments.forEach((comment: any) => commentIdsRef.current.add(comment.id));
      
      // Update polling reference: the newest timestamp is now the first comment (index 0)
      // This ensures the next polling doesn't count these same comments again
      if (newComments.length > 0) {
        newestVisibleTimestampRef.current = newComments[0].createdAt;
      }
      
      // Clear pending state
      setPendingComments([]);
      setPendingCount(0);
      pendingSinceRef.current = null;
      
      // Update cursor for infinite scroll (oldest of the new comments)
      if (newComments.length > 0) {
        setNextCursor(newComments[newComments.length - 1].createdAt);
      }
      
      // Restart polling now that pending comments have been shown
      // Use the caseId from ref since we don't have it as a parameter
      if (caseIdRef.current) {
        startPolling(caseIdRef.current);
      }
    } catch (err: any) {
      console.error('Error fetching new comments:', err);
      
      // Even on error, try to restart polling so user can continue viewing
      if (caseIdRef.current) {
        startPolling(caseIdRef.current);
      }
    }
  }, []);
  
  const hideNewCommentsIndicator = useCallback(() => {
    setPendingComments([]);
    setPendingCount(0);
  }, []);

  return {
    // State
    visibleComments,
    pendingComments,
    pendingCount,
    hasMore,
    nextCursor,
    isFetching,
    isPollingEnabled,
    error,
    
    // Actions
    fetchInitialComments,
    fetchOlderComments,
    checkForNewComments,
    addComment,
    updateComment,
    deleteComment,
    fetchReplies,
    
    // UI Actions
    showNewComments,
    hideNewCommentsIndicator,
  };
}
