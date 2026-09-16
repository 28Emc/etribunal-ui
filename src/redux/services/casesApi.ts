/**
 * ============================================
 * redux/services/casesApi.ts — RTK Query API de Casos
 * ============================================
 *
 * ¿Qué es?
 *   Es la fuente de verdad única del módulo feed/detalle de casos.
 *   Reemplaza el trío de fuentes previas:
 *     - redux/slices/casesSlice (thunks legacy, sin consumidores)
 *     - hooks/useCases (estado local con cache vacía)
 *     - llamadas apiClient directas en páginas
 *
 * ¿Cómo funciona el feed infinito?
 *   - getFeed usa serializeQueryArgs para que skip NO participe de la
 *     clave de cache: una sola entrada por (tab, category, q).
 *   - forceRefetch pide al servidor cuando cambia skip (paginación).
 *   - merge concatena por id (dedup) cuando skip > 0 y reemplaza al
 *     resetear a skip 0 (cambio de tab/categoría).
 *
 * ¿Cómo se mantienen los contadores coherentes?
 *   Las mutaciones (votar, guardar, reaccionar) actualizan la cache
 *   vía updateQueryData tanto en el feed como en el detalle, con los
 *   valores que devuelve el backend. No hace falta refetch manual.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import type { ThunkAction } from '@reduxjs/toolkit';
import type { UnknownAction } from 'redux';
import type { AppDispatch, RootState } from '../store';
import { authStorage } from '@api/client';
import type { Case, FeedTab } from '@typings/index';
import { mapDbCaseToCase } from '@services/mappers/caseMapper';
import { baseQuery } from './rtkApiClient';
import { toReactionCounts, type ReactionEmoji, type ReactionPayload } from './reactionContract';

// ============================================================
// Constantes
// ============================================================

export const FEED_PAGE_SIZE = 20;

// ============================================================
// Tipos públicos
// ============================================================

export interface FeedArgs {
  tab: FeedTab;
  category: string;
  q: string;
  skip: number;
}

export interface FeedResult {
  cases: Case[];
  hasMore: boolean;
}

export interface VotePayload {
  vote_type: 'A' | 'B' | 'BOTH_WRONG' | null;
  votes_a: number;
  votes_b: number;
  votes_both_wrong: number;
}

export interface SavePayload {
  saved: boolean;
  anchorsCount: number;
}

// ============================================================
// API
// ============================================================

export const casesApi = createApi({
  reducerPath: 'casesApi',
  baseQuery,
  tagTypes: ['Case'],
  endpoints: (builder) => ({
    /**
     * Feed paginado. Una sola entrada de cache por (tab, category, q);
     * skip solo dispara refetch (forceRefetch) y merge concatena.
     */
    getFeed: builder.query<FeedResult, FeedArgs>({
      query: (args) => ({
        url: '/cases',
        params: {
          skip: args.skip,
          take: FEED_PAGE_SIZE,
          feedType: args.tab,
          category: args.category === 'All' ? '' : args.category,
          q: args.q,
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => `${queryArgs.tab}|${queryArgs.category}|${queryArgs.q}`,
      transformResponse: (raw: unknown, _meta, args: FeedArgs) => {
        const currentUserId = authStorage.getUserId() ?? undefined;
        const cases = Array.isArray(raw)
          ? raw.map((caseData: Record<string, unknown>) => mapDbCaseToCase(caseData, currentUserId))
          : [];
        return { cases, hasMore: cases.length === FEED_PAGE_SIZE };
      },
      merge: (cache, incoming, { arg }) => {
        if (arg.skip === 0 || !cache) return incoming;
        const unique = new Map<string, Case>(cache.cases.map((c) => [c.id, c]));
        for (const next of incoming.cases) unique.set(next.id, next);
        return { cases: [...unique.values()], hasMore: incoming.hasMore };
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.skip !== previousArg?.skip,
      providesTags: (result) =>
        result ? result.cases.map((c) => ({ type: 'Case' as const, id: c.id })) : [],
    }),

    /**
     * Detalle de un caso (fuente para la futura migración de CaseDetailPage).
     */
    getCase: builder.query<Case, string>({
      query: (id) => ({ url: `/cases/${id}` }),
      transformResponse: (raw: unknown) => {
        return mapDbCaseToCase(raw as Record<string, unknown>, authStorage.getUserId() ?? undefined);
      },
      providesTags: (_result, _error, id) => [{ type: 'Case' as const, id }],
    }),

    /**
     * Votar en un caso. Actualiza la cache del feed y del detalle
     * con los contadores que devuelve el backend.
     */
    voteCase: builder.mutation<VotePayload, { caseId: string; voteType: 'A' | 'B' | 'BOTH_WRONG' }>({
      query: ({ caseId, voteType }) => ({
        url: `/cases/${caseId}/votes`,
        method: 'POST',
        body: { vote_type: voteType },
      }),
      async onQueryStarted({ caseId }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          applyCasePatch(dispatch, getState, caseId, (draft) => {
            draft.votesA = data.votes_a;
            draft.votesB = data.votes_b;
            draft.votesBothWrong = data.votes_both_wrong;
            draft.userVote = data.vote_type;
          });
        } catch {
          // El error se propaga al caller; la cache queda como estaba.
        }
      },
    }),

    /**
     * Quitar el voto de un caso (mismo contrato que voteCase).
     */
    removeVote: builder.mutation<VotePayload, { caseId: string }>({
      query: ({ caseId }) => ({ url: `/cases/${caseId}/votes`, method: 'DELETE' }),
      async onQueryStarted({ caseId }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          applyCasePatch(dispatch, getState, caseId, (draft) => {
            draft.votesA = data.votes_a;
            draft.votesB = data.votes_b;
            draft.votesBothWrong = data.votes_both_wrong;
            draft.userVote = data.vote_type;
          });
        } catch {
          // El error se propaga al caller; la cache queda como estaba.
        }
      },
    }),

    /**
     * Anclar/desanclar un caso. transformResponse normaliza el
     * payload del backend ({ saved, caseResponse?.total_anchors }).
     */
    saveCase: builder.mutation<SavePayload, { caseId: string }>({
      query: ({ caseId }) => ({ url: `/saved-cases/${caseId}/save`, method: 'POST', body: {} }),
      transformResponse: (raw: Record<string, unknown>) => {
        const caseResponse = raw.caseResponse as Record<string, unknown> | undefined;
        return {
          saved: raw.saved === true,
          anchorsCount: typeof caseResponse?.total_anchors === 'number' ? caseResponse.total_anchors : 0,
        };
      },
      async onQueryStarted({ caseId }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          applyCasePatch(dispatch, getState, caseId, (draft) => {
            draft.isSaved = data.saved;
            draft.anchorsCount = data.anchorsCount;
          });
        } catch {
          // El error se propaga al caller; la cache queda como estaba.
        }
      },
    }),

    /**
     * Reaccionar a un caso (solo target_type CASE). Las reacciones a
     * comentarios van por commentsApi.reactToComment (cache de
     * comentarios, no de casos).
     */
    reactToCase: builder.mutation<ReactionPayload, { caseId: string; emoji: ReactionEmoji }>({
      query: ({ caseId, emoji }) => ({
        url: '/reactions',
        method: 'POST',
        body: { target_type: 'CASE', target_id: caseId, emoji },
      }),
      async onQueryStarted({ caseId }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          applyCasePatch(dispatch, getState, caseId, (draft) => {
            draft.reactions = toReactionCounts(data.reactions);
            draft.userReaction = data.user_reaction;
          });
        } catch {
          // El error se propaga al caller; la cache queda como estaba.
        }
      },
    }),
  }),
});

// ============================================================
// Helpers de cache
// ============================================================

type CaseUpdater = (draft: Case) => void;

function getCachedFeedArgs(getState: () => unknown): FeedArgs[] {
  return casesApi.util.selectCachedArgsForQuery(getState() as never, 'getFeed') as FeedArgs[];
}

/**
 * Aplica un cambio a un caso en TODAS las entradas cacheadas del feed
 * (selectCachedArgsForQuery itera cada argumento real de getFeed) y en
 * el detalle. No-op si la cache no existe aún.
 */
function applyCasePatch(dispatch: AppDispatch, getState: () => unknown, caseId: string, updater: CaseUpdater) {
  const feedArgsList = getCachedFeedArgs(getState);
  for (const args of feedArgsList) {
    dispatch(
      casesApi.util.updateQueryData('getFeed', args, (draft) => {
        const target = draft.cases.find((c) => c.id === caseId);
        if (target) updater(target);
      })
    );
  }
  dispatch(
    casesApi.util.updateQueryData('getCase', caseId, (draft) => {
      updater(draft);
    })
  );
}

/**
 * Inserta un caso recién creado al inicio de todas las entradas del feed.
 * Se exporta como thunk para usarse desde CreateCasePage.
 */
export function prependCaseToFeed(newCase: Case): ThunkAction<void, RootState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    const feedArgsList = getCachedFeedArgs(getState);
    for (const args of feedArgsList) {
      dispatch(
        casesApi.util.updateQueryData('getFeed', args, (draft) => {
          draft.cases = [newCase, ...draft.cases];
        })
      );
    }
  };
}

/**
 * Incrementa sharesCount en todas las entradas del feed y el detalle.
 * Se exporta como thunk para usarse desde FeedPage (ShareModal).
 */
export function incrementCaseShareCount(caseId: string): ThunkAction<void, RootState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    const feedArgsList = getCachedFeedArgs(getState);
    for (const args of feedArgsList) {
      dispatch(
        casesApi.util.updateQueryData('getFeed', args, (draft) => {
          const target = draft.cases.find((c) => c.id === caseId);
          if (target) target.sharesCount = (target.sharesCount ?? 0) + 1;
        })
      );
    }
    dispatch(
      casesApi.util.updateQueryData('getCase', caseId, (draft) => {
        draft.sharesCount = (draft.sharesCount ?? 0) + 1;
      })
    );
  };
}

// ============================================================
// Hooks generados
// ============================================================

export const {
  useGetFeedQuery,
  useGetCaseQuery,
  useVoteCaseMutation,
  useRemoveVoteMutation,
  useSaveCaseMutation,
  useReactToCaseMutation,
} = casesApi;