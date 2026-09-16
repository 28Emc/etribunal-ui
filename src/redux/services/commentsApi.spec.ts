import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import type { CaseComment } from '@typings/index';
import { commentsApi } from './commentsApi';

const { mockRequest, mockGetUserId } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-123'),
}));

vi.mock('@api/client', () => ({
  apiClient: { request: (...args: unknown[]) => mockRequest(...args) },
  authStorage: { getUserId: mockGetUserId },
}));

vi.mock('@services/mappers/caseMapper', () => ({
  mapDbCommentToComment: vi.fn((raw: Record<string, unknown>) => ({
    id: raw.id as string,
    user: (raw.user as Record<string, unknown> | undefined)?.username as string ?? 'anon',
    userId: (raw.user as Record<string, unknown> | undefined)?.id as string | undefined,
    avatar: (raw.user as Record<string, unknown> | undefined)?.avatarUrl as string ?? '',
    text: raw.content as string,
    timestamp: (raw.created_at as string) ?? '',
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
    reactions: { LIKE: 0, LOVE: 0, ANGRY: 0 },
    userReaction: null,
    likes: 0,
    isOwner: false,
    contentLanguage: undefined,
    replies_count: (raw.replies_count as number) ?? 0,
    reactions_count: (raw.reactions_count as number) ?? 0,
    replies: Array.isArray(raw.replies)
      ? (raw.replies as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          text: r.content as string,
        }))
      : [],
  })) as unknown as (raw: Record<string, unknown>, userId?: string) => CaseComment,
}));

function createStore() {
  return configureStore({
    reducer: { [commentsApi.reducerPath]: commentsApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(commentsApi.middleware),
  });
}

const selectComments = (caseId: string) =>
  commentsApi.endpoints.getComments.select({ caseId, limit: 20 });

function rawComment(id: string, createdAt = '2025-01-01T10:00:00.000Z') {
  return {
    id,
    content: `Comentario ${id}`,
    created_at: createdAt,
    user: { id: 'u1', username: 'juez1', avatarUrl: 'http://x/a.png' },
  };
}

function rawPage(ids: string[], hasMore = true, nextCursor: string | null = 'cur-next') {
  return {
    data: ids.map((id) => rawComment(id)),
    next_cursor: nextCursor,
    has_more: hasMore,
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('commentsApi — getComments', () => {
  it('debería llamar a GET /cases/:id/comments con limit por defecto 20', async () => {
    mockRequest.mockResolvedValueOnce(rawPage(['c1', 'c2']));

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/cases/case-1/comments',
        method: 'GET',
        params: expect.objectContaining({ limit: 20 }),
      })
    );
  });

  it('debería normalizar next_cursor/has_more y mapear comentarios', async () => {
    mockRequest.mockResolvedValueOnce(rawPage(['c1']));

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    const { data } = selectComments('case-1')(store.getState());
    expect(data?.hasMore).toBe(true);
    expect(data?.nextCursor).toBe('cur-next');
    expect(data?.comments[0].id).toBe('c1');
    expect(data?.comments[0].user).toBe('juez1');
    expect(mockGetUserId).toHaveBeenCalled();
  });

  it('debería almacenar una sola entrada de cache por caseId', async () => {
    mockRequest.mockResolvedValueOnce(rawPage(['c1']));

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    const queryEntries = Object.keys(store.getState().commentsApi.queries);
    expect(queryEntries).toEqual(['case-1']);
  });

  it('debería anexar comentarios al final cuando se pagina con before (más viejos)', async () => {
    mockRequest
      .mockResolvedValueOnce(rawPage(['c1', 'c2'], true, 'cursor-1'))
      .mockResolvedValueOnce(rawPage(['c3', 'c4'], false, null));

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));
    await store.dispatch(
      commentsApi.endpoints.getComments.initiate({ caseId: 'case-1', before: 'cursor-1' })
    );
    await flush();

    const { data } = selectComments('case-1')(store.getState());
    expect(data?.comments.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(data?.hasMore).toBe(false);
    expect(data?.nextCursor).toBeNull();
  });

  it('debería anteponer comentarios al inicio con after y conservar hasMore/nextCursor', async () => {
    mockRequest
      .mockResolvedValueOnce(rawPage(['c1'], true, 'cursor-1'))
      .mockResolvedValueOnce(rawPage(['c0'], true, 'cursor-new'));

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));
    await store.dispatch(
      commentsApi.endpoints.getComments.initiate({ caseId: 'case-1', after: '2025-01-02T00:00:00.000Z' })
    );
    await flush();

    const { data } = selectComments('case-1')(store.getState());
    expect(data?.comments.map((c) => c.id)).toEqual(['c0', 'c1']);
    expect(data?.hasMore).toBe(true);
    expect(data?.nextCursor).toBe('cursor-1');
  });

  it('debería evitar duplicados al mezclar páginas', async () => {
    mockRequest
      .mockResolvedValueOnce(rawPage(['c1', 'c2']))
      .mockResolvedValueOnce(rawPage(['c2', 'c3']));

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));
    await store.dispatch(
      commentsApi.endpoints.getComments.initiate({ caseId: 'case-1', before: 'cursor-1' })
    );
    await flush();

    const { data } = selectComments('case-1')(store.getState());
    expect(data?.comments.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('debería devolver el error del backend cuando la request falla', async () => {
    mockRequest.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Caso no encontrado' } },
      message: 'Request failed',
    });

    const store = createStore();
    const result = await store.dispatch(
      commentsApi.endpoints.getComments.initiate({ caseId: 'nope' })
    );

    expect(result.error).toEqual({ status: 404, data: 'Caso no encontrado' });
  });
});

describe('commentsApi — getNewCommentsCount', () => {
  it('debería aceptar `since` ISO y normalizar el conteo numérico', async () => {
    mockRequest.mockResolvedValueOnce(3);

    const store = createStore();
    await store.dispatch(
      commentsApi.endpoints.getNewCommentsCount.initiate({
        caseId: 'case-1',
        since: '2025-01-01T10:00:00.000Z',
      })
    );

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/cases/case-1/comments/new',
        params: expect.objectContaining({ since: '2025-01-01T10:00:00.000Z' }),
      })
    );
    const { data } = commentsApi.endpoints.getNewCommentsCount.select({
      caseId: 'case-1',
      since: '2025-01-01T10:00:00.000Z',
    })(store.getState());
    expect(data).toEqual({ count: 3 });
  });
});

describe('commentsApi — mutaciones (actualizan la cache)', () => {
  it('addComment debería POSTear y anteponer el nuevo comentario en la cache', async () => {
    mockRequest.mockResolvedValueOnce(rawPage(['c1']));
    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    mockRequest.mockResolvedValueOnce(rawComment('c2', '2025-01-03T10:00:00.000Z'));
    await store.dispatch(
      commentsApi.endpoints.addComment.initiate({ caseId: 'case-1', content: 'Nuevo' })
    );
    await flush();

    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: '/cases/case-1/comments',
        method: 'POST',
        data: { content: 'Nuevo' },
      })
    );
    const { data } = selectComments('case-1')(store.getState());
    expect(data?.comments[0].id).toBe('c2');
    expect(data?.comments).toHaveLength(2);
  });

  it('updateComment debería actualizar el texto en la cache (top-level y replies)', async () => {
    mockRequest.mockResolvedValueOnce({
      data: [
        {
          ...rawComment('c1'),
          replies: [{ id: 'r1', content: 'Réplica original' }],
        },
      ],
      next_cursor: null,
      has_more: false,
    });
    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    mockRequest.mockResolvedValueOnce({ ...rawComment('r1'), content: 'Réplica editada' });
    await store.dispatch(
      commentsApi.endpoints.updateComment.initiate({ commentId: 'r1', content: 'Réplica editada' })
    );
    await flush();

    const { data } = selectComments('case-1')(store.getState());
    const parent = data?.comments[0];
    expect(parent?.replies?.[0].text).toBe('Réplica editada');
  });

  it('deleteComment debería eliminar el comentario de la cache', async () => {
    mockRequest.mockResolvedValueOnce(rawPage(['c1', 'c2']));
    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    mockRequest.mockResolvedValueOnce(null);
    await store.dispatch(commentsApi.endpoints.deleteComment.initiate({ commentId: 'c1' }));
    await flush();

    const { data } = selectComments('case-1')(store.getState());
    expect(data?.comments.map((c) => c.id)).toEqual(['c2']);
  });

  it('reactToComment debería POSTear /reactions y actualizar reacciones de un top-level', async () => {
    mockRequest.mockResolvedValueOnce(rawPage(['c1']));
    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    mockRequest.mockResolvedValueOnce({
      reactions: [{ emoji: 'LIKE', count: 3 }],
      user_reaction: 'LIKE',
    });
    await store.dispatch(
      commentsApi.endpoints.reactToComment.initiate({ commentId: 'c1', emoji: 'LIKE' })
    );
    await flush();

    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: '/reactions',
        method: 'POST',
        data: { target_type: 'COMMENT', target_id: 'c1', emoji: 'LIKE' },
      })
    );
    const { data } = selectComments('case-1')(store.getState());
    expect(data?.comments[0].reactions).toEqual({ LIKE: 3, LOVE: 0, ANGRY: 0 });
    expect(data?.comments[0].userReaction).toBe('LIKE');
  });

  it('reactToComment debería actualizar reacciones de una respuesta anidada en replies', async () => {
    mockRequest.mockResolvedValueOnce({
      data: [
        { ...rawComment('c1'), replies: [{ id: 'r1', content: 'Réplica' }] },
      ],
      next_cursor: null,
      has_more: false,
    });
    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getComments.initiate({ caseId: 'case-1' }));

    mockRequest.mockResolvedValueOnce({
      reactions: [{ emoji: 'LOVE', count: 1 }],
      user_reaction: null,
    });
    await store.dispatch(
      commentsApi.endpoints.reactToComment.initiate({ commentId: 'r1', emoji: 'LOVE' })
    );
    await flush();

    const { data } = selectComments('case-1')(store.getState());
    const reply = data?.comments[0].replies?.[0];
    expect(reply?.reactions).toEqual({ LIKE: 0, LOVE: 1, ANGRY: 0 });
    expect(reply?.userReaction).toBeNull();
  });
});

describe('commentsApi — getReplies', () => {
  it('debería llamar a GET /comments/:id/replies y mapear cada respuesta', async () => {
    mockRequest.mockResolvedValueOnce([rawComment('r1'), rawComment('r2')]);

    const store = createStore();
    await store.dispatch(commentsApi.endpoints.getReplies.initiate('c1'));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/comments/c1/replies' })
    );
    const { data } = commentsApi.endpoints.getReplies.select('c1')(store.getState());
    expect(data?.map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});