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
  /** Current rendered item count. Used to unlock the load gate only after new data arrives. */
  itemCount: number;
  /** Optional: root margin for IntersectionObserver (e.g. "200px" to load earlier) */
  rootMargin?: string;
  /** Optional: threshold 0–1 */
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  itemCount,
  rootMargin = '200px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const loadingRef = useRef(false);
  const expectedNextCountRef = useRef<number | null>(null);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!loadingRef.current) return;

    // Unlock once a new page has materially changed list length, or there is nothing else to load.
    if (!hasMore || (expectedNextCountRef.current != null && itemCount > expectedNextCountRef.current)) {
      loadingRef.current = false;
      expectedNextCountRef.current = null;
    }
  }, [itemCount, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || !hasMore || loadingRef.current) return;
        loadingRef.current = true;
        expectedNextCountRef.current = itemCount;
        onLoadMoreRef.current();
      },
      { rootMargin, threshold }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, itemCount, rootMargin, threshold]);

  return sentinelRef;
}
