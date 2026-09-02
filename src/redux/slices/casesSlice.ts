/**
 * ============================================
 * redux/slices/casesSlice.ts — Estado de Casos
 * ============================================
 *
 * ¿Qué hace?
 *   Maneja el estado de los casos en el feed y el detalle.
 *
 * Thunks:
 *   - fetchFeed:      Obtiene casos paginados para el feed
 *   - fetchCaseById:  Obtiene un caso individual (detalle)
 *   - voteCase:       Vota en un caso (A / B / BothWrong)
 *   - removeVote:     Quita el voto de un caso
 *   - saveCase:       Guarda/desguarda un caso
 *   - reactToCase:    Reacciona a un caso (LIKE / LOVE / ANGRY)
 *
 * Estado:
 *   - feed:           Array de casos para el feed
 *   - currentCase:    Caso seleccionado (detalle)
 *   - pagination:     Control de skip/hasMore para infinite scroll
 *   - filters:        Filtros activos (tab, categoría, búsqueda)
 */

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { apiClient, authStorage } from '@api/client';
import { mapDbCaseToCase } from '@services/mappers/caseMapper';
import type { Case, FeedTab } from '@typings/index';

// ============================================================
// State
// ============================================================

export interface CasesState {
  feed: Case[];
  currentCase: Case | null;
  pagination: {
    skip: number;
    hasMore: boolean;
  };
  filters: {
    tab: FeedTab;
    category: string;
    query: string;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: CasesState = {
  feed: [],
  currentCase: null,
  pagination: {
    skip: 0,
    hasMore: true,
  },
  filters: {
    tab: 'for_you',
    category: 'All',
    query: '',
  },
  isLoading: false,
  error: null,
};

// ============================================================
// Thunks
// ============================================================

/**
 * fetchFeed — Obtiene casos paginados para el feed principal.
 *
 * @param reset - Si es true, reinicia el feed (nueva búsqueda/categoría)
 */
export const fetchFeed = createAsyncThunk(
  'cases/fetchFeed',
  async (
    params: {
      reset?: boolean;
      tab?: FeedTab;
      category?: string;
      query?: string;
    },
    { getState }
  ) => {
    const state = getState() as { cases: CasesState };
    const currentSkip = params.reset
      ? 0
      : state.cases.pagination.skip;
    const tab = params.tab || state.cases.filters.tab;
    const category =
      params.category !== undefined
        ? params.category
        : state.cases.filters.category;
    const query =
      params.query !== undefined
        ? params.query
        : state.cases.filters.query;

    const queryParams = new URLSearchParams({
      skip: String(currentSkip),
      take: '20',
      feedType: tab,
      category: category !== 'All' ? category : '',
      q: query,
    });

    const data: any[] = await apiClient.get(`/cases?${queryParams}`);
    const currentUserId = authStorage.getUserId() ?? undefined;
    const mappedData = data.map((c: any) =>
      mapDbCaseToCase(c, currentUserId)
    );

    return {
      cases: mappedData,
      hasMore: mappedData.length === 20,
      skip: currentSkip + mappedData.length,
      filters: { tab, category, query },
      reset: params.reset || false,
    };
  }
);

/**
 * fetchCaseById — Obtiene un caso individual para la vista de detalle.
 */
export const fetchCaseById = createAsyncThunk(
  'cases/fetchCaseById',
  async (caseId: string) => {
    const data: any = await apiClient.get(`/cases/${caseId}`);
    const currentUserId = authStorage.getUserId() ?? undefined;
    return mapDbCaseToCase(data, currentUserId);
  }
);

/**
 * voteCase — Vota en un caso (side A, B, o BothWrong).
 */
export const voteCase = createAsyncThunk(
  'cases/voteCase',
  async (
    {
      caseId,
      voteType,
    }: { caseId: string; voteType: 'A' | 'B' | 'BothWrong' },
    { rejectWithValue }
  ) => {
    if (!authStorage.isAuthenticated()) {
      return rejectWithValue('Not authenticated');
    }
    try {
      const data: any = await apiClient.post(`/cases/${caseId}/votes`, {
        vote_type: voteType,
      });
      return { caseId, ...data };
    } catch (error) {
      return rejectWithValue('Error voting');
    }
  }
);

/**
 * removeVote — Quita el voto de un caso.
 */
export const removeVote = createAsyncThunk(
  'cases/removeVote',
  async (caseId: string, { rejectWithValue }) => {
    if (!authStorage.isAuthenticated()) {
      return rejectWithValue('Not authenticated');
    }
    try {
      const data: any = await apiClient.delete(`/cases/${caseId}/votes`);
      return { caseId, ...data };
    } catch (error) {
      return rejectWithValue('Error removing vote');
    }
  }
);

/**
 * saveCase — Guarda o desguarda un caso.
 */
export const saveCase = createAsyncThunk(
  'cases/saveCase',
  async (
    { caseId, save }: { caseId: string; save: boolean },
    { rejectWithValue }
  ) => {
    if (!authStorage.isAuthenticated()) {
      return rejectWithValue('Not authenticated');
    }
    try {
      if (save) {
        await apiClient.post(`/saved-cases/${caseId}/save`, {});
      } else {
        await apiClient.delete(`/saved-cases/${caseId}/save`);
      }
      return { caseId, isSaved: save };
    } catch (error) {
      return rejectWithValue('Error saving case');
    }
  }
);

/**
 * reactToCase — Agrega o quita una reacción en un caso.
 */
export const reactToCase = createAsyncThunk(
  'cases/reactToCase',
  async (
    {
      caseId,
      emoji,
    }: { caseId: string; emoji: 'LIKE' | 'LOVE' | 'ANGRY' },
    { rejectWithValue }
  ) => {
    if (!authStorage.isAuthenticated()) {
      return rejectWithValue('Not authenticated');
    }
    try {
      const data: any = await apiClient.post('/reactions', {
        target_type: 'CASE',
        target_id: caseId,
        emoji,
      });
      return { caseId, ...data };
    } catch (error) {
      return rejectWithValue('Error reacting');
    }
  }
);

// ============================================================
// Slice
// ============================================================

const casesSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    /** updateCaseInFeed — Actualiza optimistamente un caso en el feed */
    updateCaseInFeed(
      state,
      action: PayloadAction<{
        caseId: string;
        updates: Partial<Case> | ((prev: Case) => Case);
      }>
    ) {
      const { caseId, updates } = action.payload;
      const index = state.feed.findIndex((c) => c.id === caseId);
      if (index !== -1) {
        state.feed[index] =
          typeof updates === 'function'
            ? updates(state.feed[index])
            : { ...state.feed[index], ...updates };
      }
    },

    /** updateCurrentCase — Actualiza el caso en detalle */
    updateCurrentCase(state, action: PayloadAction<Partial<Case>>) {
      if (state.currentCase) {
        state.currentCase = {
          ...state.currentCase,
          ...action.payload,
        };
      }
    },

    /** clearFeed — Limpia el feed */
    clearFeed(state) {
      state.feed = [];
      state.pagination = { skip: 0, hasMore: true };
      state.error = null;
    },

    /** clearCurrentCase — Limpia el caso en detalle */
    clearCurrentCase(state) {
      state.currentCase = null;
    },

    /** setFilters — Actualiza los filtros activos */
    setFilters(
      state,
      action: PayloadAction<{
        tab?: FeedTab;
        category?: string;
        query?: string;
      }>
    ) {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
  },

  extraReducers: (builder) => {
    // --- fetchFeed ---
    builder.addCase(fetchFeed.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchFeed.fulfilled, (state, action) => {
      const { cases, hasMore, skip, filters, reset } = action.payload;
      state.feed = reset ? cases : [...state.feed, ...cases];
      state.pagination = { skip, hasMore };
      state.filters = filters;
      state.isLoading = false;
    });
    builder.addCase(fetchFeed.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Error fetching feed';
      if (state.feed.length === 0) {
        state.pagination = { skip: 0, hasMore: false };
      }
    });

    // --- fetchCaseById ---
    builder.addCase(fetchCaseById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCaseById.fulfilled, (state, action) => {
      state.currentCase = action.payload;
      state.isLoading = false;
    });
    builder.addCase(fetchCaseById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Error fetching case';
    });

    // --- voteCase / removeVote (optimistic) ---
    builder.addCase(voteCase.fulfilled, (state, action) => {
      const { case_id, vote_type, votes_a, votes_b, votes_both_wrong } =
        action.payload;

      // Actualizar en feed
      const feedIndex = state.feed.findIndex((c) => c.id === case_id);
      if (feedIndex !== -1) {
        state.feed[feedIndex].votesA = votes_a;
        state.feed[feedIndex].votesB = votes_b;
        state.feed[feedIndex].votesBothWrong = votes_both_wrong;
      }

      // Actualizar currentCase si es el mismo
      const cc = state.currentCase;
      if (cc && cc.id === case_id) {
        cc.votesA = votes_a;
        cc.votesB = votes_b;
        cc.votesBothWrong = votes_both_wrong;
      }
    });

    builder.addCase(removeVote.fulfilled, (state, action) => {
      const { case_id, votes_a, votes_b, votes_both_wrong } =
        action.payload;

      const feedIndex = state.feed.findIndex((c) => c.id === case_id);
      if (feedIndex !== -1) {
        state.feed[feedIndex].votesA = votes_a;
        state.feed[feedIndex].votesB = votes_b;
        state.feed[feedIndex].votesBothWrong = votes_both_wrong;
      }

      const cc = state.currentCase;
      if (cc && cc.id === case_id) {
        cc.votesA = votes_a;
        cc.votesB = votes_b;
        cc.votesBothWrong = votes_both_wrong;
      }
    });

    // --- saveCase ---
    builder.addCase(saveCase.fulfilled, (state, action) => {
      const { caseId, isSaved } = action.payload;

      const feedIndex = state.feed.findIndex((c) => c.id === caseId);
      if (feedIndex !== -1) {
        state.feed[feedIndex].isSaved = isSaved;
      }

      const savedCc = state.currentCase;
      if (savedCc && savedCc.id === caseId) {
        savedCc.isSaved = isSaved;
      }
    });
  },
});

export const {
  updateCaseInFeed,
  updateCurrentCase,
  clearFeed,
  clearCurrentCase,
  setFilters,
} = casesSlice.actions;

export default casesSlice.reducer;
