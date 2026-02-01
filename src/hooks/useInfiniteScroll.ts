/**
 * Infinite scroll: call loadMore when a sentinel element enters the viewport.
 * Use with a ref on a sentinel div at the end of the list.
 */

import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  /** Callback when sentinel is visible and hasMore is true */
  onLoadMore: () => void;
  /** Only trigger when there may be more items (e.g. current length === limit) */
  hasMore: boolean;
  /** Optional: root margin for IntersectionObserver (e.g. "200px" to load earlier) */
  rootMargin?: string;
  /** Optional: threshold 0–1 */
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  rootMargin = '200px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || !hasMore || loadingRef.current) return;
        loadingRef.current = true;
        onLoadMore();
        // Allow next load after a tick (Convex will re-run and may return more)
        requestAnimationFrame(() => {
          loadingRef.current = false;
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, rootMargin, threshold]);

  return sentinelRef;
}
