import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComments } from './useComments';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockIsAuth = vi.fn(() => true);

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  authStorage: {
    getUserId: vi.fn(() => 'user-123'),
    isAuthenticated: (...args: any[]) => mockIsAuth(...args),
  },
}));

vi.mock('@utils/helpers', () => ({
  formatRelativeCaseDate: vi.fn(() => 'hace 1 día'),
}));

function makeDbComment(id: string, overrides = {}) {
  return {
    id,
    content: 'Comentario de prueba',
    created_at: '2024-01-15T10:00:00.000Z',
    user: { id: 'u1', username: 'testuser', avatar_url: null },
    replies: [],
    reactions: [],
    ...overrides,
  };
}

function makeDbReply(id: string, overrides = {}) {
  return makeDbComment(id, { ...overrides });
}

describe('useComments', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockDelete.mockReset();
    mockIsAuth.mockReset();
    mockIsAuth.mockReturnValue(true);
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useComments());

    expect(result.current.visibleComments).toEqual([]);
    expect(result.current.pendingComments).toEqual([]);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isPollingEnabled).toBe(true);
  });

  it('fetchInitialComments debería obtener comentarios iniciales', async () => {
    const { result } = renderHook(() => useComments());

    mockGet.mockResolvedValue({
      data: [makeDbComment('c1'), makeDbComment('c2')],
      nextCursor: 'cursor-abc',
      hasMore: true,
    });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    expect(result.current.visibleComments).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.nextCursor).toBe('cursor-abc');
    expect(result.current.isFetching).toBe(false);
    expect(mockGet).toHaveBeenCalledWith('/cases/case-1/comments?limit=20');
  });

  it('fetchInitialComments debería manejar error', async () => {
    const { result } = renderHook(() => useComments());

    mockGet.mockRejectedValue(new Error('Error de red'));

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    expect(result.current.error).toBe('Error de red');
    expect(result.current.isFetching).toBe(false);
  });

  it('fetchOlderComments debería obtener más comentarios', async () => {
    const { result } = renderHook(() => useComments());

    mockGet
      .mockResolvedValueOnce({
        data: [makeDbComment('c1')],
        nextCursor: 'cursor-1',
        hasMore: true,
      });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c0')],
      nextCursor: 'cursor-2',
      hasMore: false,
    });

    await act(async () => {
      await result.current.fetchOlderComments('case-1');
    });

    expect(result.current.visibleComments).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
    expect(mockGet).toHaveBeenLastCalledWith(
      expect.stringContaining('before=cursor-1')
    );
  });

  it('fetchOlderComments no debería ejecutarse si !hasMore o isFetching', async () => {
    const { result } = renderHook(() => useComments());

    mockGet.mockResolvedValue({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    mockGet.mockClear();

    await act(async () => {
      await result.current.fetchOlderComments('case-1');
    });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('checkForNewComments debería detectar comentarios nuevos', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useComments());

    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', { created_at: '2024-01-15T10:00:00.000Z' })],
      nextCursor: null,
      hasMore: false,
    });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    mockGet.mockResolvedValue({ count: 3 });

    let count: number = 0;
    await act(async () => {
      count = await result.current.checkForNewComments('case-1');
    });

    expect(count).toBe(3);
    expect(result.current.pendingCount).toBe(3);
    expect(mockGet).toHaveBeenLastCalledWith(
      expect.stringContaining('/comments/new?since=')
    );
    vi.useRealTimers();
  });

  it('addComment debería agregar comentario optimistamente', async () => {
    const { result } = renderHook(() => useComments());

    mockPost.mockResolvedValue(makeDbComment('c-new'));

    let added: any;
    await act(async () => {
      added = await result.current.addComment('case-1', 'Nuevo comentario');
    });

    expect(added).toBeDefined();
    expect(result.current.visibleComments).toHaveLength(1);
    expect(result.current.visibleComments[0].id).toBe('c-new');
    expect(mockPost).toHaveBeenCalledWith('/cases/case-1/comments', {
      content: 'Nuevo comentario',
    });
  });

  it('addComment debería incluir parent_id si es reply', async () => {
    const { result } = renderHook(() => useComments());

    mockPost.mockResolvedValue(makeDbComment('c-reply'));

    mockGet.mockResolvedValue({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });

    await act(async () => {
      await result.current.addComment('case-1', 'Respuesta', 'parent-1');
    });

    expect(mockPost).toHaveBeenCalledWith('/cases/case-1/comments', {
      content: 'Respuesta',
      parent_id: 'parent-1',
    });
  });

  it('addComment debería retornar undefined si no autenticado', async () => {
    mockIsAuth.mockReturnValue(false);

    const { result } = renderHook(() => useComments());

    let added: any = 'fallback';
    await act(async () => {
      added = await result.current.addComment('case-1', 'Test');
    });

    expect(added).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('updateComment debería actualizar comentario existente', async () => {
    const { result } = renderHook(() => useComments());

    mockGet.mockResolvedValue({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    expect(result.current.visibleComments).toHaveLength(1);
    expect(result.current.visibleComments[0].text).toBe('Comentario de prueba');

    mockPut.mockResolvedValue(
      makeDbComment('c1', { content: 'Versión editada' })
    );

    await act(async () => {
      await result.current.updateComment('c1', 'Versión editada');
    });

    expect(mockPut).toHaveBeenCalledWith('/comments/c1', {
      content: 'Versión editada',
    });
    expect(result.current.visibleComments[0].text).toBe('Versión editada');
  });

  it('deleteComment debería eliminar comentario', async () => {
    const { result } = renderHook(() => useComments());

    mockGet.mockResolvedValue({
      data: [makeDbComment('c1'), makeDbComment('c2')],
      nextCursor: null,
      hasMore: false,
    });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    expect(result.current.visibleComments).toHaveLength(2);

    mockDelete.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.deleteComment('c1');
    });

    expect(mockDelete).toHaveBeenCalledWith('/comments/c1');
    expect(result.current.visibleComments).toHaveLength(1);
    expect(result.current.visibleComments[0].id).toBe('c2');
  });

  it('fetchReplies debería obtener respuestas', async () => {
    const { result } = renderHook(() => useComments());

    mockGet.mockResolvedValue([makeDbReply('r1'), makeDbReply('r2')]);

    let replies: any[] = [];
    await act(async () => {
      replies = await result.current.fetchReplies('c1');
    });

    expect(replies).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith('/comments/c1/replies');
  });

  it('showNewComments debería mostrar comentarios pendientes y reiniciar polling', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useComments());

    mockGet
      .mockResolvedValueOnce({
        data: [makeDbComment('c1')],
        nextCursor: null,
        hasMore: false,
      });

    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });

    mockGet.mockResolvedValue({ count: 2 });

    await act(async () => {
      await result.current.checkForNewComments('case-1');
    });

    expect(result.current.pendingCount).toBe(2);

    mockGet.mockResolvedValue({
      data: [makeDbComment('c2'), makeDbComment('c3')],
    });

    await act(async () => {
      await result.current.showNewComments();
    });

    expect(result.current.visibleComments).toHaveLength(3);
    expect(result.current.pendingCount).toBe(0);
    vi.useRealTimers();
  });

  it('hideNewCommentsIndicator debería limpiar pendientes', () => {
    const { result } = renderHook(() => useComments());

    act(() => {
      result.current.hideNewCommentsIndicator();
    });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.pendingComments).toEqual([]);
  });

  it('mapDbCommentToComment debería procesar reactions con currentUserId', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', {
        reactions: [
          { emoji: 'LIKE', user_id: 'user-123' },
          { emoji: 'LIKE', user_id: 'other-1' },
          { emoji: 'ANGRY', user_id: 'other-2' },
        ]
      })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });
    expect(result.current.visibleComments).toHaveLength(1);
    expect(result.current.visibleComments[0].userReaction).toBe('LIKE');
  });

  it('mapDbCommentToComment debería manejar reactions undefined', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', { reactions: undefined })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });
    expect(result.current.visibleComments).toHaveLength(1);
  });

  it('mapDbCommentToComment debería manejar user_reaction directo', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', { user_reaction: 'LOVE', reactions: [] })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });
    expect(result.current.visibleComments[0].userReaction).toBe('LOVE');
  });

  it('mapDbCommentToComment debería manejar created_at como Date', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', { created_at: new Date('2024-01-15T10:00:00.000Z') })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });
    expect(result.current.visibleComments[0].id).toBe('c1');
  });

  it('mapDbCommentToComment debería manejar created_at inválido', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', { created_at: 'not-a-date' })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });
    expect(result.current.visibleComments[0].id).toBe('c1');
  });

  it('mapDbCommentToComment debería manejar created_at como número', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValue({
      data: [makeDbComment('c1', { created_at: 1705312800000 })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => {
      await result.current.fetchInitialComments('case-1');
    });
    expect(result.current.visibleComments[0].id).toBe('c1');
  });

  it('checkForNewComments debería retornar 0 si no hay visibleComments ni newestTimestamp', async () => {
    const { result } = renderHook(() => useComments());
    const count = await act(async () => result.current.checkForNewComments('case-1'));
    expect(count).toBe(0);
  });

  it('checkForNewComments debería retornar 0 si pendingCount > 0', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1', { created_at: '2024-01-15T10:00:00.000Z' })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockGet.mockResolvedValue({ count: 2 });
    await act(async () => result.current.checkForNewComments('case-1'));
    expect(result.current.pendingCount).toBe(2);
    const secondCount = await act(async () => result.current.checkForNewComments('case-1'));
    expect(secondCount).toBe(0);
  });

  it('checkForNewComments debería manejar error de API', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1', { created_at: '2024-01-15T10:00:00.000Z' })],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const count = await act(async () => result.current.checkForNewComments('case-1'));
    expect(count).toBe(0);
  });

  it('fetchOlderComments debería manejar error de API', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1')],
      nextCursor: 'cursor-1',
      hasMore: true,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockGet.mockRejectedValueOnce(new Error('Error fetching older'));
    await act(async () => result.current.fetchOlderComments('case-1'));
    expect(result.current.error).toBe('Error fetching older');
  });

  it('addComment debería refetchear si es reply', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('parent')],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockPost.mockResolvedValueOnce(makeDbComment('reply-1'));
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('parent'), makeDbComment('reply-1')],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.addComment('case-1', 'Reply text', 'parent-1'));
    expect(result.current.visibleComments.length).toBeGreaterThanOrEqual(1);
  });

  it('updateComment debería no hacer nada si no autenticado', async () => {
    mockIsAuth.mockReturnValue(false);
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockPut.mockClear();
    await act(async () => result.current.updateComment('c1', 'nuevo texto'));
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('updateComment debería manejar error de API', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockPut.mockRejectedValueOnce(new Error('Update failed'));
    await expect(
      act(async () => result.current.updateComment('c1', 'nuevo texto'))
    ).rejects.toThrow('Update failed');
  });

  it('deleteComment debería no hacer nada si no autenticado', async () => {
    mockIsAuth.mockReturnValue(false);
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockDelete.mockClear();
    await act(async () => result.current.deleteComment('c1'));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deleteComment debería manejar error de API', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockResolvedValueOnce({
      data: [makeDbComment('c1')],
      nextCursor: null,
      hasMore: false,
    });
    await act(async () => result.current.fetchInitialComments('case-1'));
    mockDelete.mockRejectedValueOnce(new Error('Delete failed'));
    await expect(
      act(async () => result.current.deleteComment('c1'))
    ).rejects.toThrow('Delete failed');
  });

  it('fetchReplies debería manejar error de API', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockRejectedValueOnce(new Error('Fetch replies error'));
    const replies = await act(async () => result.current.fetchReplies('c1'));
    expect(replies).toEqual([]);
  });

  it('showNewComments debería no hacer nada si no hay pendingSinceRef', async () => {
    const { result } = renderHook(() => useComments());
    mockGet.mockClear();
    await act(async () => result.current.showNewComments());
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('addComment debería manejar error de API', async () => {
    const { result } = renderHook(() => useComments());
    mockPost.mockRejectedValueOnce(new Error('Post failed'));
    await expect(
      act(async () => result.current.addComment('case-1', 'test'))
    ).rejects.toThrow('Post failed');
  });
});
