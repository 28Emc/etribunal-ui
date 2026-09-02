import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: (initialValue: any) => {
      if (initialValue === null) {
        return { current: document.createElement('div') };
      }
      return actual.useRef(initialValue);
    },
  };
});

describe('useInfiniteScroll', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let intersectionCallback!: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
        intersectionCallback = cb;
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = disconnectMock;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('debería devolver un ref', () => {
    const { result } = renderHook(() => useInfiniteScroll({
      onLoadMore: vi.fn(),
      hasMore: true,
      isLoading: false,
    }));

    expect(result.current.loadMoreRef).toBeDefined();
  });

  it('debería llamar onLoadMore cuando el centinela se intersecta', () => {
    const loadMore = vi.fn();
    renderHook(() => useInfiniteScroll({
      onLoadMore: loadMore,
      hasMore: true,
      isLoading: false,
    }));

    act(() => {
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('NO debería llamar onLoadMore si hasMore es false', () => {
    const loadMore = vi.fn();
    renderHook(() => useInfiniteScroll({
      onLoadMore: loadMore,
      hasMore: false,
      isLoading: false,
    }));

    act(() => {
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('NO debería llamar onLoadMore si isLoading es true', () => {
    const loadMore = vi.fn();
    renderHook(() => useInfiniteScroll({
      onLoadMore: loadMore,
      hasMore: true,
      isLoading: true,
    }));

    act(() => {
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('NO debería llamar onLoadMore si no está intersectando', () => {
    const loadMore = vi.fn();
    renderHook(() => useInfiniteScroll({
      onLoadMore: loadMore,
      hasMore: true,
      isLoading: false,
    }));

    act(() => {
      intersectionCallback([{ isIntersecting: false } as IntersectionObserverEntry]);
    });

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('debería llamar onLoadMore solo una vez si sigue intersectando (lock)', () => {
    const loadMore = vi.fn();
    renderHook(() => useInfiniteScroll({
      onLoadMore: loadMore,
      hasMore: true,
      isLoading: false,
    }));

    act(() => {
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    act(() => {
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('debería desconectar el observer al desmontar', () => {
    const { unmount } = renderHook(() => useInfiniteScroll({
      onLoadMore: vi.fn(),
      hasMore: true,
      isLoading: false,
    }));

    unmount();

    expect(disconnectMock).toHaveBeenCalled();
  });
});
