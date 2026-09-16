import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { CaseComment } from '@typings/index';
import { useCommentsData } from './useCommentsData';

const mocks = vi.hoisted(() => {
  const mockDispatch = vi.fn((_action: unknown) => ({ unsubscribe: vi.fn() }));
  const mockUseGetCommentsQuery = vi.fn((_arg: unknown, _opts?: unknown) => ({ data: undefined, isFetching: false }));
  const mockUseGetNewCommentsCountQuery = vi.fn((_arg: unknown, _opts?: unknown) => ({ data: { count: 0 } }));
  const mockAddTrigger = vi.fn((_arg: unknown) => ({ unwrap: vi.fn() }));
  const mockUpdateTrigger = vi.fn((_arg: unknown) => ({ unwrap: vi.fn() }));
  const mockDeleteTrigger = vi.fn((_arg: unknown) => ({ unwrap: vi.fn() }));
  const mockInitiate = vi.fn((_arg: unknown) => ({ unsubscribe: vi.fn() }));
  return {
    mockDispatch,
    mockUseGetCommentsQuery,
    mockUseGetNewCommentsCountQuery,
    mockAddTrigger,
    mockUpdateTrigger,
    mockDeleteTrigger,
    mockInitiate,
  };
});

vi.mock('@redux/hooks', () => ({
  useAppDispatch: () => mocks.mockDispatch,
}));

vi.mock('@redux/services/commentsApi', () => ({
  COMMENTS_PAGE_SIZE: 20,
  NEW_COMMENTS_LIMIT: 50,
  commentsApi: {
    endpoints: {
      getComments: { initiate: (arg: unknown) => mocks.mockInitiate(arg) },
    },
  },
  useGetCommentsQuery: (arg: unknown, opts?: unknown) => mocks.mockUseGetCommentsQuery(arg, opts),
  useGetNewCommentsCountQuery: (arg: unknown, opts?: unknown) =>
    mocks.mockUseGetNewCommentsCountQuery(arg, opts),
  useAddCommentMutation: () => [mocks.mockAddTrigger],
  useUpdateCommentMutation: () => [mocks.mockUpdateTrigger],
  useDeleteCommentMutation: () => [mocks.mockDeleteTrigger],
}));

function makeComment(id: string, createdAt = '2025-01-01T10:00:00.000Z'): CaseComment {
  return {
    id,
    user: 'juez1',
    userId: 'u1',
    avatar: 'http://x/a.png',
    text: `Comentario ${id}`,
    timestamp: 'hace 1 día',
    createdAt,
    reactions: { LIKE: 0, LOVE: 0, ANGRY: 0 },
    userReaction: null,
    likes: 0,
    isOwner: false,
    contentLanguage: undefined,
    replies_count: 0,
    reactions_count: 0,
    replies: [],
  };
}

function mockComments(comments: CaseComment[], nextCursor: string | null = null, hasMore = false) {
  mocks.mockUseGetCommentsQuery.mockReturnValue({
    data: { comments, nextCursor, hasMore },
    isFetching: false,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockUseGetCommentsQuery.mockReturnValue({ data: undefined, isFetching: false });
  mocks.mockUseGetNewCommentsCountQuery.mockReturnValue({ data: { count: 0 } });
});

describe('useCommentsData', () => {
  it('debería devolver estado inicial sin caseId', () => {
    const { result } = renderHook(() => useCommentsData(undefined));

    expect(result.current.visibleComments).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.isFetching).toBe(false);
  });

  it('debería consultar comentarios por caseId y exponerlos', () => {
    mockComments([makeComment('c1'), makeComment('c2')], 'cur-1', true);

    const { result } = renderHook(() => useCommentsData('case-1'));

    expect(mocks.mockUseGetCommentsQuery).toHaveBeenCalledWith(
      { caseId: 'case-1', limit: 20 },
      { skip: false }
    );
    expect(result.current.visibleComments.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.nextCursor).toBe('cur-1');
  });

  it('default newestTimestamp → query de conteo con pollingInterval 15s', () => {
    mockComments([makeComment('c1', '2025-06-01T10:00:00.000Z')]);

    renderHook(() => useCommentsData('case-1'));

    expect(mocks.mockUseGetNewCommentsCountQuery).toHaveBeenCalledWith(
      { caseId: 'case-1', since: '2025-06-01T10:00:00.000Z' },
      expect.objectContaining({ pollingInterval: 15000, skipPollingIfUnfocused: true })
    );
  });

  it('debería pausar el polling cuando hay comentarios pendientes por mostrar', () => {
    mockComments([makeComment('c1')]);
    mocks.mockUseGetNewCommentsCountQuery.mockReturnValue({ data: { count: 2 } });

    const { result } = renderHook(() => useCommentsData('case-1'));
    void result.current;

    const lastCall = mocks.mockUseGetNewCommentsCountQuery.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual({ caseId: 'case-1', since: '2025-01-01T10:00:00.000Z' });
    expect(lastCall?.[1]).toEqual(
      expect.objectContaining({ pollingInterval: 0 })
    );
  });

  it('debería marcar pendingCount y seleccionar `since` auto-desde el más nuevo', async () => {
    mockComments([makeComment('c1')]);
    mocks.mockUseGetNewCommentsCountQuery.mockReturnValue({ data: { count: 3 } });

    const { result } = renderHook(() => useCommentsData('case-1'));

    await waitFor(() => expect(result.current.pendingCount).toBe(3));

    act(() => result.current.showNewComments());

    expect(mocks.mockInitiate).toHaveBeenCalledWith({
      caseId: 'case-1',
      after: '2025-01-01T10:00:00.000Z',
      limit: 50,
    });
    expect(result.current.pendingCount).toBe(0);
  });

  it('fetchOlderComments debería iniciar una carga hacia el cursor anterior', () => {
    mockComments([makeComment('c1')], 'cursor-anterior', true);

    const { result } = renderHook(() => useCommentsData('case-1'));
    act(() => result.current.fetchOlderComments('case-1'));

    expect(mocks.mockInitiate).toHaveBeenCalledWith({
      caseId: 'case-1',
      before: 'cursor-anterior',
      limit: 20,
    });
  });

  it('fetchOlderComments no debería llamar sin cursor o sin hasMore', () => {
    mockComments([makeComment('c1')], null, false);

    const { result } = renderHook(() => useCommentsData('case-1'));
    act(() => result.current.fetchOlderComments('case-1'));

    expect(mocks.mockInitiate).not.toHaveBeenCalled();
  });

  it('showNewComments no debería iniciar nada sin since pendiente', () => {
    renderHook(() => useCommentsData('case-1'));

    act(() => {});

    expect(mocks.mockInitiate).not.toHaveBeenCalled();
  });

  it('hideNewCommentsIndicator debería limpiar el contador', async () => {
    mocks.mockUseGetNewCommentsCountQuery.mockReturnValue({ data: { count: 5 } });

    const { result } = renderHook(() => useCommentsData('case-1'));
    await waitFor(() => expect(result.current.pendingCount).toBe(5));

    act(() => result.current.hideNewCommentsIndicator());

    expect(result.current.pendingCount).toBe(0);
  });

  it('addComment debería delegar en la mutación con parentId opcional', async () => {
    const promise = Promise.resolve(makeComment('c9'));
    mocks.mockAddTrigger.mockReturnValue(
      Object.assign(promise, { unwrap: () => promise }) as never
    );

    const { result } = renderHook(() => useCommentsData('case-1'));
    await act(async () => {
      await result.current.addComment('case-1', 'Hola', 'c-parent');
    });

    expect(mocks.mockAddTrigger).toHaveBeenCalledWith({
      caseId: 'case-1',
      content: 'Hola',
      parentId: 'c-parent',
    });
  });

  it('updateComment y deleteComment deberían delegar en sus mutaciones', async () => {
    const updatePromise = Promise.resolve({});
    const deletePromise = Promise.resolve(undefined);
    mocks.mockUpdateTrigger.mockReturnValue(
      Object.assign(updatePromise, { unwrap: () => updatePromise }) as never
    );
    mocks.mockDeleteTrigger.mockReturnValue(
      Object.assign(deletePromise, { unwrap: () => deletePromise }) as never
    );

    const { result } = renderHook(() => useCommentsData('case-1'));
    await act(async () => {
      await result.current.updateComment('c1', 'Editado');
      await result.current.deleteComment('c1');
    });

    expect(mocks.mockUpdateTrigger).toHaveBeenCalledWith({ commentId: 'c1', content: 'Editado' });
    expect(mocks.mockDeleteTrigger).toHaveBeenCalledWith({ commentId: 'c1' });
  });
});