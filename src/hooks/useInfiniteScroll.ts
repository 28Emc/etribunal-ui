import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 0.5
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLocked = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      isLocked.current = false;
    }
  }, [isLoading]);

  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const target = entries[0];
          if (target.isIntersecting && hasMore && !isLoading && !isLocked.current) {
            isLocked.current = true;
            onLoadMore();
          }
        },
        { root: null, rootMargin: '20px', threshold }
      );

      observerRef.current.observe(loadMoreRef.current);

      return () => {
        observerRef.current?.disconnect();
      };
    }
  }, [onLoadMore, hasMore, isLoading, threshold]);

  return { loadMoreRef };
}
