import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import type { Case } from '@typings/index';
import { casesApi } from './casesApi';

const { mockRequest, mockGetUserId } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockGetUserId: vi.fn(() => 'user-123'),
}));

vi.mock('@api/client', () => ({
  apiClient: { request: (...args: unknown[]) => mockRequest(...args) },
  authStorage: { getUserId: mockGetUserId },
}));

vi.mock('@services/mappers/caseMapper', () => ({
  mapDbCaseToCase: vi.fn((raw: Record<string, unknown>) => ({
    id: raw.id as string,
    title: raw.title as string,
    votesA: (raw.votes_a as number) ?? 0,
    votesB: (raw.votes_b as number) ?? 0,
    votesBothWrong: (raw.votes_both_wrong as number) ?? 0,
    userVote: null,
    isSaved: false,
    anchorsCount: 0,
    reactions: { LIKE: 0, LOVE: 0, ANGRY: 0 },
    userReaction: null,
    commentsCount: 0,
    sharesCount: 0,
  })) as unknown as (raw: Record<string, unknown>, userId?: string) => Case,
}));

function createStore() {
  return configureStore({
    reducer: { [casesApi.reducerPath]: casesApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(casesApi.middleware),
  });
}

const feedArgs = { tab: 'for_you' as const, category: 'All', q: '', skip: 0 };
const selectFeed = () =>
  casesApi.endpoints.getFeed.select({ ...feedArgs, skip: 0 });

function rawCase(id: string, votesA = 0) {
  return { id, title: `Caso ${id}`, votes_a: votesA, votes_b: 0, votes_both_wrong: 0 };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('casesApi — getFeed', () => {
  it('debería llamar a GET /cases con los parámetros correctos', async () => {
    mockRequest.mockResolvedValueOnce([rawCase('c1')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/cases',
        method: 'GET',
        params: expect.objectContaining({
          skip: 0,
          take: 20,
          feedType: 'for_you',
          category: '',
        }),
      })
    );
  });

  it('debería mapear casos con el userId y marcar hasMore según el tamaño de página', async () => {
    const page = Array.from({ length: 20 }, (_, i) => rawCase(`c${i}`));
    mockRequest.mockResolvedValueOnce(page);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));

    const state = store.getState();
    const { data, isSuccess } = selectFeed()(state);

    expect(isSuccess).toBe(true);
    expect(data?.cases).toHaveLength(20);
    expect(data?.hasMore).toBe(true);
    expect(mockGetUserId).toHaveBeenCalled();
  });

  it('debería marcar hasMore=false cuando la respuesta es más corta que la página', async () => {
    mockRequest.mockResolvedValueOnce([rawCase('c1')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));

    const { data } = selectFeed()(store.getState());
    expect(data?.hasMore).toBe(false);
  });

  it('debería concatenar páginas por id al hacer scroll (skip > 0)', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => rawCase(`c${i}`));
    mockRequest
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce([rawCase('c20'), rawCase('c21')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));
    await store.dispatch(
      casesApi.endpoints.getFeed.initiate({ ...feedArgs, skip: 20 })
    );

    const { data } = selectFeed()(store.getState());
    expect(data?.cases).toHaveLength(22);
    expect(data?.cases[21].id).toBe('c21');
  });

  it('debería reemplazar la lista al resetear skip a 0 (cambio de tab/categoría)', async () => {
    mockRequest
      .mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) => rawCase(`c${i}`)))
      .mockResolvedValueOnce([rawCase('c20'), rawCase('c21')])
      .mockResolvedValueOnce([rawCase('c1'), rawCase('c2'), rawCase('c3')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));
    await store.dispatch(
      casesApi.endpoints.getFeed.initiate({ ...feedArgs, skip: 20 })
    );
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));

    const { data } = selectFeed()(store.getState());
    expect(data?.cases).toHaveLength(3);
    expect(data?.cases[0].id).toBe('c1');
  });

  it('debería cachear separadamente por tab/categoría/query', async () => {
    mockRequest
      .mockResolvedValueOnce([rawCase('c1')])
      .mockResolvedValueOnce([rawCase('c2')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));
    await store.dispatch(
      casesApi.endpoints.getFeed.initiate({ ...feedArgs, tab: 'trending' })
    );

    const queryEntries = Object.keys(store.getState().casesApi.queries);
    expect(queryEntries).toHaveLength(2);
  });

  it('debería devolver el error del backend cuando la request falla', async () => {
    mockRequest.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Campos inválidos' } },
      message: 'Request failed',
    });

    const store = createStore();
    const result = await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));

    expect(result.error).toEqual({ status: 400, data: 'Campos inválidos' });
  });
});

describe('casesApi — mutaciones (actualizan la cache del feed)', () => {
  async function storeWithCase(id: string) {
    mockRequest.mockResolvedValueOnce([rawCase(id, 10)]);
    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));
    return store;
  }

  it('voteCase debería actualizar contadores y userVote en la cache del feed', async () => {
    const store = await storeWithCase('c1');
    mockRequest.mockResolvedValueOnce({
      vote_type: 'A',
      votes_a: 11,
      votes_b: 5,
      votes_both_wrong: 2,
    });

    await store.dispatch(
      casesApi.endpoints.voteCase.initiate({ caseId: 'c1', voteType: 'A' })
    );
    await flush();

    const { data } = selectFeed()(store.getState());
    const updated = data?.cases.find((c) => c.id === 'c1');
    expect(updated?.votesA).toBe(11);
    expect(updated?.votesB).toBe(5);
    expect(updated?.votesBothWrong).toBe(2);
    expect(updated?.userVote).toBe('A');
  });

  it('removeVote debería quitar el voto del usuario en la cache', async () => {
    const store = await storeWithCase('c1');
    mockRequest.mockResolvedValueOnce({
      vote_type: null,
      votes_a: 10,
      votes_b: 0,
      votes_both_wrong: 0,
    });

    await store.dispatch(casesApi.endpoints.removeVote.initiate({ caseId: 'c1' }));
    await flush();

    const { data } = selectFeed()(store.getState());
    expect(data?.cases.find((c) => c.id === 'c1')?.userVote).toBeNull();
  });

  it('saveCase debería normalizar y actualizar isSaved/anchorsCount', async () => {
    const store = await storeWithCase('c1');
    mockRequest.mockResolvedValueOnce({
      saved: true,
      caseResponse: { total_anchors: 7 },
    });

    await store.dispatch(casesApi.endpoints.saveCase.initiate({ caseId: 'c1' }));
    await flush();

    const { data } = selectFeed()(store.getState());
    const updated = data?.cases.find((c) => c.id === 'c1');
    expect(updated?.isSaved).toBe(true);
    expect(updated?.anchorsCount).toBe(7);
  });

  it('reactToCase debería enviar POST /reactions y normalizar en la cache', async () => {
    const store = await storeWithCase('c1');
    mockRequest.mockResolvedValueOnce({
      reactions: [
        { emoji: 'LIKE', count: 3 },
        { emoji: 'LOVE', count: 1 },
      ],
      user_reaction: 'LIKE',
    });

    await store.dispatch(
      casesApi.endpoints.reactToCase.initiate({ caseId: 'c1', emoji: 'LIKE' })
    );
    await flush();

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/reactions',
        method: 'POST',
        data: { target_type: 'CASE', target_id: 'c1', emoji: 'LIKE' },
      })
    );

    const { data } = selectFeed()(store.getState());
    const updated = data?.cases.find((c) => c.id === 'c1');
    expect(updated?.reactions).toEqual({ LIKE: 3, LOVE: 1, ANGRY: 0 });
    expect(updated?.userReaction).toBe('LIKE');
  });
});

describe('casesApi — getCase (detalle)', () => {
  it('voteCase debería actualizar también la cache del detalle', async () => {
    mockRequest
      .mockResolvedValueOnce([rawCase('c1', 10)])
      .mockResolvedValueOnce(rawCase('c1', 10));

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getFeed.initiate(feedArgs));
    await store.dispatch(casesApi.endpoints.getCase.initiate('c1'));

    mockRequest.mockResolvedValueOnce({
      vote_type: 'B',
      votes_a: 10,
      votes_b: 6,
      votes_both_wrong: 0,
    });
    await store.dispatch(
      casesApi.endpoints.voteCase.initiate({ caseId: 'c1', voteType: 'B' })
    );
    await flush();

    const detail = casesApi.endpoints.getCase.select('c1')(store.getState());
    expect(detail.data?.votesB).toBe(6);
    expect(detail.data?.userVote).toBe('B');
  });

  it('voteCase actualiza también la cache del detalle keyed por slug', async () => {
    mockRequest.mockResolvedValueOnce(rawCase('c1', 10));

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getCase.initiate('ana/primer-caso'));

    mockRequest.mockResolvedValueOnce({
      vote_type: 'B',
      votes_a: 10,
      votes_b: 6,
      votes_both_wrong: 0,
    });
    await store.dispatch(
      casesApi.endpoints.voteCase.initiate({ caseId: 'c1', voteType: 'B' })
    );
    await flush();

    const detail = casesApi.endpoints.getCase.select('ana/primer-caso')(store.getState());
    expect(detail.data?.votesB).toBe(6);
    expect(detail.data?.userVote).toBe('B');
  });
});

describe('casesApi — listas del perfil', () => {
  it('getUserCases debería llamar a GET /users/:username/cases con params', async () => {
    mockRequest.mockResolvedValueOnce([rawCase('c1')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getUserCases.initiate({ username: 'ana', skip: 0, take: 10 }));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/users/ana/cases',
        params: { skip: 0, take: 10 },
      })
    );

    const state = store.getState();
    const { data } = casesApi.endpoints.getUserCases.select({ username: 'ana', skip: 0, take: 10 })(state);
    expect(data?.cases).toHaveLength(1);
    expect(data?.cases[0]?.id).toBe('c1');
  });

  it('getSavedCases debería normalizar id desde case_id (respuesta { cases })', async () => {
    mockRequest.mockResolvedValueOnce({ cases: [{ case_id: 'c9', id: 'row-1', title: 'Saved' }], total: 1 });

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getSavedCases.initiate({ skip: 0, take: 10 }));

    const state = store.getState();
    const { data } = casesApi.endpoints.getSavedCases.select({ skip: 0, take: 10 })(state);
    expect(data?.cases[0]?.id).toBe('c9');
  });

  it('getUserVotes debería llamar a GET /users/me/votes', async () => {
    mockRequest.mockResolvedValueOnce([rawCase('c2')]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getUserVotes.initiate({ skip: 0, take: 10 }));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/users/me/votes', params: { skip: 0, take: 10 } })
    );
  });

  it('getUserCases debería concatenar páginas con merge y hasMore', async () => {
    mockRequest
      .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => rawCase(`c${i}`)))
      .mockResolvedValueOnce(Array.from({ length: 5 }, (_, i) => rawCase(`c${i + 10}`)));

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getUserCases.initiate({ username: 'ana', skip: 0, take: 10 }));
    await store.dispatch(casesApi.endpoints.getUserCases.initiate({ username: 'ana', skip: 10, take: 10 }));

    const state = store.getState();
    const { data } = casesApi.endpoints.getUserCases.select({ username: 'ana', skip: 0, take: 10 })(state);
    expect(data?.cases).toHaveLength(15);
    expect(data?.hasMore).toBe(false);
  });

  it('voteCase debería actualizar también la cache de getUserCases', async () => {
    mockRequest.mockResolvedValueOnce([rawCase('c1', 5)]);

    const store = createStore();
    await store.dispatch(casesApi.endpoints.getUserCases.initiate({ username: 'ana', skip: 0, take: 10 }));

    mockRequest.mockResolvedValueOnce({
      vote_type: 'B',
      votes_a: 5,
      votes_b: 6,
      votes_both_wrong: 0,
    });
    await store.dispatch(casesApi.endpoints.voteCase.initiate({ caseId: 'c1', voteType: 'B' }));
    await flush();

    const state = store.getState();
    const { data } = casesApi.endpoints.getUserCases.select({ username: 'ana', skip: 0, take: 10 })(state);
    expect(data?.cases[0]?.votesB).toBe(6);
    expect(data?.cases[0]?.userVote).toBe('B');
  });
});