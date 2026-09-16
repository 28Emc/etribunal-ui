import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { usersApi, type TopJudge } from './usersApi';

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock('@api/client', () => ({
  apiClient: { request: (...args: unknown[]) => mockRequest(...args) },
}));

function createStore() {
  return configureStore({
    reducer: { [usersApi.reducerPath]: usersApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(usersApi.middleware),
  });
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function rawJudge(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    username: `juez_${id}`,
    avatar_url: null,
    is_anonymous: false,
    followers_count: 5,
    is_following: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usersApi — getTopJudges', () => {
  it('debería llamar a GET /users/top-judges con limit=20', async () => {
    mockRequest.mockResolvedValueOnce([rawJudge('u1')]);

    const store = createStore();
    await store.dispatch(usersApi.endpoints.getTopJudges.initiate(undefined));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/users/top-judges',
        method: 'GET',
        params: { limit: 20 },
      })
    );
  });

  it('debería normalizar las filas al shape TopJudge', async () => {
    mockRequest.mockResolvedValueOnce([
      rawJudge('u1', { followers_count: '3', is_anonymous: true, avatar_url: 'http://a/img.png' }),
    ]);

    const store = createStore();
    await store.dispatch(usersApi.endpoints.getTopJudges.initiate(undefined));

    const { data } = usersApi.endpoints.getTopJudges.select(undefined)(store.getState());
    const judge: TopJudge | undefined = data?.[0];

    expect(judge).toMatchObject({
      id: 'u1',
      username: 'juez_u1',
      avatar_url: 'http://a/img.png',
      is_anonymous: true,
      followers_count: 3,
      is_following: false,
    });
  });

  it('debería devolver lista vacía si la respuesta no es un array', async () => {
    mockRequest.mockResolvedValueOnce({ cases: [] });

    const store = createStore();
    await store.dispatch(usersApi.endpoints.getTopJudges.initiate(undefined));

    const { data } = usersApi.endpoints.getTopJudges.select(undefined)(store.getState());
    expect(data).toEqual([]);
  });
});

describe('usersApi — followUser', () => {
  it('debería llamar a POST /users/{username}/follow con body vacío', async () => {
    mockRequest.mockResolvedValueOnce({ following: true });

    const store = createStore();
    await store.dispatch(usersApi.endpoints.followUser.initiate({ username: 'juez_u1' }));

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/users/juez_u1/follow',
        method: 'POST',
        data: {},
      })
    );
  });

  it('debería actualizar la cache optimistamente (is_following y followers_count)', async () => {
    mockRequest
      .mockResolvedValueOnce([rawJudge('u1')])
      .mockResolvedValueOnce({ following: true });
    const store = createStore();
    await store.dispatch(usersApi.endpoints.getTopJudges.initiate(undefined));

    await store.dispatch(usersApi.endpoints.followUser.initiate({ username: 'juez_u1' }));
    await flush();

    const { data } = usersApi.endpoints.getTopJudges.select(undefined)(store.getState());
    expect(data?.[0]?.is_following).toBe(true);
    expect(data?.[0]?.followers_count).toBe(6);
  });

  it('debería revertir el patch si el POST falla', async () => {
    mockRequest
      .mockResolvedValueOnce([rawJudge('u1')])
      .mockRejectedValueOnce(new Error('network'));

    const store = createStore();
    await store.dispatch(usersApi.endpoints.getTopJudges.initiate(undefined));

    await store
      .dispatch(usersApi.endpoints.followUser.initiate({ username: 'juez_u1' }))
      .then(() => {}, () => {});
    await flush();

    const { data } = usersApi.endpoints.getTopJudges.select(undefined)(store.getState());
    expect(data?.[0]?.is_following).toBe(false);
    expect(data?.[0]?.followers_count).toBe(5);
  });

  it('debería no romper la cache si el juez no está cargado', async () => {
    mockRequest.mockResolvedValueOnce({ following: true });

    const store = createStore();
    await store
      .dispatch(usersApi.endpoints.followUser.initiate({ username: 'sin_cache' }))
      .then(() => {}, () => {});

    const { data } = usersApi.endpoints.getTopJudges.select(undefined)(store.getState());
    expect(data).toBeUndefined();
  });
});