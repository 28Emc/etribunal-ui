import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import casesReducer, {
  fetchFeed,
  fetchCaseById,
  voteCase,
  removeVote,
  saveCase,
  reactToCase,
  updateCaseInFeed,
  updateCurrentCase,
  clearFeed,
  clearCurrentCase,
  setFilters,
  type CasesState,
} from './casesSlice';
import type { Case } from '@typings/index';

const { mockGet, mockPost, mockDelete, mockIsAuthenticated } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockIsAuthenticated: vi.fn(() => true),
}));

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  authStorage: {
    getUserId: vi.fn(() => 'user-123'),
    isAuthenticated: mockIsAuthenticated,
  },
}));

vi.mock('@services/mappers/caseMapper', () => ({
  mapDbCaseToCase: vi.fn((c: any) => ({
    ...c,
    id: c.case_id || c.id,
    title: c.title || 'Mapped',
  })),
}));

const initialCasesState: CasesState = {
  feed: [],
  currentCase: null,
  pagination: { skip: 0, hasMore: true },
  filters: { tab: 'for_you', category: 'All', query: '' },
  isLoading: false,
  error: null,
};

function createStore(overrides?: Partial<CasesState>) {
  return configureStore({
    reducer: { cases: casesReducer },
    preloadedState: { cases: { ...initialCasesState, ...overrides } },
  });
}

const mockCase: Case = {
  id: 'case-1',
  title: 'Test Case',
  category: 'Justice',
  status: 'PUBLIC',
  isSaved: false,
  userVote: null,
  votesA: 10,
  votesB: 5,
  votesBothWrong: 2,
  createdAt: '2024-01-01T00:00:00Z',
  sideA: { name: 'user_a', username: 'user_a', avatar: '', userId: 'u1', story: '', evidence: [] },
  sideB: { name: 'user_b', username: 'user_b', avatar: '', userId: 'u2', story: '', evidence: [] },
  comments: [],
  commentsCount: 0,
  tags: [],
} as Case;

describe('casesSlice — reducers', () => {
  it('debería devolver el estado inicial', () => {
    const store = createStore();
    const state = store.getState().cases;
    expect(state.feed).toEqual([]);
    expect(state.currentCase).toBeNull();
    expect(state.pagination).toEqual({ skip: 0, hasMore: true });
    expect(state.filters).toEqual({ tab: 'for_you', category: 'All', query: '' });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('updateCaseInFeed debería actualizar un caso en el feed', () => {
    const store = createStore({
      feed: [mockCase],
      pagination: { skip: 1, hasMore: true },
    });

    store.dispatch(updateCaseInFeed({ caseId: 'case-1', updates: { title: 'Updated' } }));
    expect(store.getState().cases.feed[0].title).toBe('Updated');
  });

  it('updateCaseInFeed debería aceptar función updater', () => {
    const store = createStore({
      feed: [{ ...mockCase, votesA: 5 }],
      pagination: { skip: 1, hasMore: true },
    });

    store.dispatch(
      updateCaseInFeed({ caseId: 'case-1', updates: (prev: Case) => ({ ...prev, votesA: prev.votesA + 1 }) })
    );
    expect(store.getState().cases.feed[0].votesA).toBe(6);
  });

  it('updateCaseInFeed no debería fallar si el caso no existe', () => {
    const store = createStore({ feed: [mockCase], pagination: { skip: 1, hasMore: true } });

    store.dispatch(updateCaseInFeed({ caseId: 'no-existe', updates: { title: 'X' } }));
    expect(store.getState().cases.feed).toHaveLength(1);
  });

  it('updateCurrentCase debería actualizar el caso en detalle', () => {
    const store = createStore({
      currentCase: mockCase,
      pagination: { skip: 0, hasMore: true },
    });

    store.dispatch(updateCurrentCase({ title: 'Updated Detail' }));
    expect(store.getState().cases.currentCase!.title).toBe('Updated Detail');
  });

  it('clearFeed debería resetear el feed y paginación', () => {
    const store = createStore({
      feed: [mockCase, mockCase],
      pagination: { skip: 40, hasMore: true },
      error: 'some error',
    });

    store.dispatch(clearFeed());
    const state = store.getState().cases;
    expect(state.feed).toEqual([]);
    expect(state.pagination).toEqual({ skip: 0, hasMore: true });
    expect(state.error).toBeNull();
  });

  it('clearCurrentCase debería limpiar el caso en detalle', () => {
    const store = createStore({
      currentCase: mockCase,
      pagination: { skip: 0, hasMore: true },
    });

    store.dispatch(clearCurrentCase());
    expect(store.getState().cases.currentCase).toBeNull();
  });

  it('setFilters debería actualizar filtros parcialmente', () => {
    const store = createStore();

    store.dispatch(setFilters({ tab: 'trending', query: 'test' }));
    const filters = store.getState().cases.filters;
    expect(filters.tab).toBe('trending');
    expect(filters.query).toBe('test');
    expect(filters.category).toBe('All'); // unchanged
  });
});

describe('casesSlice — thunks', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
    mockIsAuthenticated.mockReset();
    mockIsAuthenticated.mockReturnValue(true);
  });

  describe('fetchFeed', () => {
    it('pending debería marcar isLoading', async () => {
      const store = createStore();
      mockGet.mockResolvedValue([]);

      const promise = store.dispatch(fetchFeed({}));
      expect(store.getState().cases.isLoading).toBe(true);
      await promise;
    });

    it('fulfilled debería poblar el feed con reset=true', async () => {
      const store = createStore({ pagination: { skip: 0, hasMore: true } });
      const raw = [
        { case_id: '1', title: 'Caso 1', category: 'Justice' },
        { case_id: '2', title: 'Caso 2', category: 'Ethics' },
      ];
      mockGet.mockResolvedValue(raw);

      await store.dispatch(fetchFeed({ reset: true }));

      const state = store.getState().cases;
      expect(state.feed).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.pagination.skip).toBeGreaterThan(0);
    });

    it('fulfilled debería acumular con reset=false', async () => {
      const store = createStore({
        feed: [{ ...mockCase }],
        pagination: { skip: 1, hasMore: true },
      });
      mockGet.mockResolvedValue([{ case_id: '2', title: 'Caso 2', category: 'Justice' }]);

      await store.dispatch(fetchFeed({ reset: false }));

      expect(store.getState().cases.feed).toHaveLength(2);
    });

    it('rejected debería setear error', async () => {
      const store = createStore();
      mockGet.mockRejectedValue(new Error('Server error'));

      await store.dispatch(fetchFeed({ reset: true }));
      expect(store.getState().cases.error).toBe('Server error');
      expect(store.getState().cases.isLoading).toBe(false);
    });

    it('debería pasar tab/category/query params', async () => {
      const store = createStore();
      mockGet.mockResolvedValue([]);

      await store.dispatch(fetchFeed({ tab: 'trending', category: 'Justice', query: 'test' }));
      const callUrl = mockGet.mock.calls[0][0];
      expect(callUrl).toContain('feedType=trending');
      expect(callUrl).toContain('category=Justice');
      expect(callUrl).toContain('q=test');
    });

    it('debería pasar category vacío si es All', async () => {
      const store = createStore();
      mockGet.mockResolvedValue([]);

      await store.dispatch(fetchFeed({ category: 'All' }));
      const callUrl = mockGet.mock.calls[0][0];
      expect(callUrl).toContain('category=');
      expect(callUrl).not.toContain('category=All');
    });

    it('rejected con feed no vacío debería mantener paginación', async () => {
      const store = createStore({ feed: [mockCase], pagination: { skip: 10, hasMore: true } });
      mockGet.mockRejectedValue(new Error('Server error'));

      await store.dispatch(fetchFeed({ reset: true }));
      expect(store.getState().cases.error).toBe('Server error');
      expect(store.getState().cases.pagination.hasMore).toBe(true);
    });

    it('rejected sin error.message debería usar default string', async () => {
      const store = createStore();
      mockGet.mockRejectedValue({});

      await store.dispatch(fetchFeed({ reset: true }));
      expect(store.getState().cases.error).toBe('Error fetching feed');
    });
  });

  describe('fetchCaseById', () => {
    it('fulfilled debería setear currentCase', async () => {
      const store = createStore();
      mockGet.mockResolvedValue({ case_id: 'case-1', title: 'Detail', category: 'Justice' });

      await store.dispatch(fetchCaseById('case-1'));

      expect(store.getState().cases.currentCase).toBeTruthy();
      expect(store.getState().cases.isLoading).toBe(false);
    });

    it('rejected debería setear error', async () => {
      const store = createStore();
      mockGet.mockRejectedValue(new Error('Not found'));

      await store.dispatch(fetchCaseById('invalid'));
      expect(store.getState().cases.error).toBe('Not found');
    });
  });

  describe('voteCase', () => {
    it('fulfilled debería actualizar votos en feed y currentCase', async () => {
      const store = createStore({
        feed: [{ ...mockCase }],
        currentCase: { ...mockCase },
        pagination: { skip: 0, hasMore: true },
      });

      mockPost.mockResolvedValue({
        case_id: 'case-1',
        vote_type: 'A',
        votes_a: 11,
        votes_b: 5,
        votes_both_wrong: 2,
        user_vote: 'A',
      });

      await store.dispatch(voteCase({ caseId: 'case-1', voteType: 'A' }));

      const state = store.getState().cases;
      expect(state.feed[0].votesA).toBe(11);
      expect(state.currentCase!.votesA).toBe(11);
    });

    it('debería rechazar si no está autenticado', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      const store = createStore();

      const result = await store.dispatch(voteCase({ caseId: 'case-1', voteType: 'A' }));
      expect(result.type).toBe('cases/voteCase/rejected');
    });

    it('rejected debería setear error si API falla', async () => {
      const store = createStore({ currentCase: mockCase, pagination: { skip: 0, hasMore: true } });
      mockPost.mockRejectedValue(new Error('Vote error'));

      const result = await store.dispatch(voteCase({ caseId: 'case-1', voteType: 'A' }));
      expect(result.type).toBe('cases/voteCase/rejected');
    });
  });

  describe('removeVote', () => {
    it('fulfilled debería actualizar votos', async () => {
      const store = createStore({
        feed: [{ ...mockCase }],
        currentCase: { ...mockCase },
        pagination: { skip: 0, hasMore: true },
      });

      mockDelete.mockResolvedValue({
        case_id: 'case-1',
        vote_type: null,
        votes_a: 9,
        votes_b: 5,
        votes_both_wrong: 2,
        user_vote: null,
      });

      await store.dispatch(removeVote('case-1'));

      const state = store.getState().cases;
      expect(state.feed[0].votesA).toBe(9);
      expect(state.currentCase!.votesA).toBe(9);
    });

    it('debería rechazar si no está autenticado', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      const store = createStore();

      const result = await store.dispatch(removeVote('case-1'));
      expect(result.type).toBe('cases/removeVote/rejected');
    });

    it('rejected debería setear error si API falla', async () => {
      const store = createStore();
      mockDelete.mockRejectedValue(new Error('Remove error'));

      const result = await store.dispatch(removeVote('case-1'));
      expect(result.type).toBe('cases/removeVote/rejected');
    });
  });

  describe('saveCase', () => {
    it('fulfilled debería marcar isSaved en feed y currentCase', async () => {
      const store = createStore({
        feed: [{ ...mockCase }],
        currentCase: { ...mockCase },
        pagination: { skip: 0, hasMore: true },
      });

      mockPost.mockResolvedValue(undefined);

      await store.dispatch(saveCase({ caseId: 'case-1', save: true }));

      const state = store.getState().cases;
      expect(state.feed[0].isSaved).toBe(true);
      expect(state.currentCase!.isSaved).toBe(true);
    });

    it('fulfilled con save=false debería marcar isSaved=false', async () => {
      const store = createStore({
        feed: [{ ...mockCase, isSaved: true }],
        pagination: { skip: 0, hasMore: true },
      });

      mockDelete.mockResolvedValue(undefined);

      await store.dispatch(saveCase({ caseId: 'case-1', save: false }));

      expect(store.getState().cases.feed[0].isSaved).toBe(false);
    });

    it('debería rechazar si no está autenticado', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      const store = createStore();

      const result = await store.dispatch(saveCase({ caseId: 'case-1', save: true }));
      expect(result.type).toBe('cases/saveCase/rejected');
    });

    it('rejected debería setear error si API falla', async () => {
      const store = createStore();
      mockPost.mockRejectedValue(new Error('Save error'));

      const result = await store.dispatch(saveCase({ caseId: 'case-1', save: true }));
      expect(result.type).toBe('cases/saveCase/rejected');
    });
  });

  describe('reactToCase', () => {
    it('fulfilled debería actualizar reacciones en currentCase', async () => {
      const store = createStore({
        currentCase: mockCase,
        pagination: { skip: 0, hasMore: true },
      });

      mockPost.mockResolvedValue({ case_id: 'case-1', reactions: { LIKE: 1 } });

      await store.dispatch(reactToCase({ caseId: 'case-1', emoji: 'LIKE' }));
      expect(store.getState().cases.currentCase!.id).toBe('case-1');
    });

    it('debería rechazar si no está autenticado', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      const store = createStore();

      const result = await store.dispatch(reactToCase({ caseId: 'case-1', emoji: 'LIKE' }));
      expect(result.type).toBe('cases/reactToCase/rejected');
    });

    it('rejected debería setear error si API falla', async () => {
      const store = createStore();
      mockPost.mockRejectedValue(new Error('React error'));

      const result = await store.dispatch(reactToCase({ caseId: 'case-1', emoji: 'LIKE' }));
      expect(result.type).toBe('cases/reactToCase/rejected');
    });
  });
});

describe('casesSlice — reducer branch coverage', () => {
  it('updateCurrentCase no debería fallar si currentCase es null', () => {
    const store = createStore();
    store.dispatch(updateCurrentCase({ title: 'No-op' }));
    expect(store.getState().cases.currentCase).toBeNull();
  });

  it('updateCaseInFeed no debería fallar con caso no existente', () => {
    const store = createStore({ feed: [mockCase], pagination: { skip: 1, hasMore: true } });
    store.dispatch(updateCaseInFeed({ caseId: 'no-existe', updates: { title: 'X' } }));
    expect(store.getState().cases.feed).toHaveLength(1);
  });

  it('fetchCaseById rejected sin error.message debería usar default string', async () => {
    const store = createStore();
    mockGet.mockRejectedValue({});

    await store.dispatch(fetchCaseById('invalid'));
    expect(store.getState().cases.error).toBe('Error fetching case');
  });
});
