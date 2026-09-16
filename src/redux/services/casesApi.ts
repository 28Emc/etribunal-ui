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

/** Tamaño de página de las listas del perfil (created/saved/voted). */
export const PROFILE_PAGE_SIZE = 10;

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

export interface UserCaseListArgs {
  username: string;
  skip: number;
  take: number;
}

export interface ProfileCaseListArgs {
  skip: number;
  take: number;
}

export interface CaseListResult {
  cases: Case[];
  hasMore: boolean;
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
     * Detalle de un caso (usado por CaseDetailPage). El argumento es la
     * clave de cache y a la vez el path del endpoint:
     *   - `/cases/:id`             → `/cases/' + id`
     *   - `/cases/:username/:slug` → `/cases/' + 'username/slug'`
     * Las mutaciones (voteCase/reactToCase/saveCase) parchean todas las
     * entradas de getCase cuya `data.id === caseId` (ver applyCasePatch),
     * cubriendo tanto cache por id como por slug.
     */
    getCase: builder.query<Case, string>({
      query: (key) => ({ url: `/cases/${key}` }),
      transformResponse: (raw: unknown) => {
        return mapDbCaseToCase(raw as Record<string, unknown>, authStorage.getUserId() ?? undefined);
      },
      providesTags: (_result, _error, id) => [{ type: 'Case' as const, id }],
    }),

    /**
     * Casos creados por un usuario (tab "created" del perfil). Paginación
     * infinita: serializa por username, forceRefetch al cambiar skip y merge
     * concatena (dedup por id). La cache es la fuente de verdad de la lista;
     * applyCasePatch mantiene voto/save/reacción coherentes.
     */
    getUserCases: builder.query<CaseListResult, UserCaseListArgs>({
      query: ({ username, skip, take }) => ({
        url: `/users/${username}/cases`,
        params: { skip, take },
      }),
      serializeQueryArgs: ({ queryArgs }) => `user-cases|${queryArgs.username}`,
      transformResponse: (raw: unknown) => mapCaseListResponse(raw),
      merge: (cache, incoming, { arg }) => mergeCaseList(cache, incoming, arg.skip),
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.skip !== previousArg?.skip,
    }),

    /**
     * Casos guardados del usuario logueado (tab "saved"). Cada item de la
     * respuesta trae `case_id` y `id`; el mapper normaliza a `id` el caso.
     */
    getSavedCases: builder.query<CaseListResult, ProfileCaseListArgs>({
      query: ({ skip, take }) => ({ url: '/saved-cases', params: { skip, take } }),
      serializeQueryArgs: () => 'saved-cases',
      transformResponse: (raw: unknown) => mapCaseListResponse(raw, { preferCaseId: true }),
      merge: (cache, incoming, { arg }) => mergeCaseList(cache, incoming, arg.skip),
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.skip !== previousArg?.skip,
    }),

    /**
     * Casos donde el usuario logueado ha votado (tab "voted").
     */
    getUserVotes: builder.query<CaseListResult, ProfileCaseListArgs>({
      query: ({ skip, take }) => ({ url: '/users/me/votes', params: { skip, take } }),
      serializeQueryArgs: () => 'user-votes',
      transformResponse: (raw: unknown) => mapCaseListResponse(raw),
      merge: (cache, incoming, { arg }) => mergeCaseList(cache, incoming, arg.skip),
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.skip !== previousArg?.skip,
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

/**
 * Normaliza la respuesta de las listas del perfil. El backend devuelve un
 * array (disponible en GET /users/:username/cases y /users/me/votes) o un
 * objeto `{ cases, total }` (GET /saved-cases). Con preferCaseId=true se
 * normaliza el id desde `case_id` (shape de saved-cases).
 */
function mapCaseListResponse(raw: unknown, opts: { preferCaseId?: boolean } = {}): CaseListResult {
  const currentUserId = authStorage.getUserId() ?? undefined;
  const nested = (raw as Record<string, unknown> | undefined)?.cases;
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(nested)) {
    list = nested;
  }
  const cases = list.map((item) => {
    const c = item as Record<string, unknown>;
    const normalized: Record<string, unknown> = opts.preferCaseId
      ? { ...c, id: c.case_id ?? c.id }
      : c;
    return mapDbCaseToCase(normalized, currentUserId);
  });
  return { cases, hasMore: cases.length === PROFILE_PAGE_SIZE };
}

function mergeCaseList(cache: CaseListResult, incoming: CaseListResult, skip: number): CaseListResult {
  if (skip === 0 || !cache) return incoming;
  const unique = new Map<string, Case>(cache.cases.map((c) => [c.id, c]));
  for (const next of incoming.cases) unique.set(next.id, next);
  return { cases: [...unique.values()], hasMore: incoming.hasMore };
}

function getCachedFeedArgs(getState: () => unknown): FeedArgs[] {
  return casesApi.util.selectCachedArgsForQuery(getState() as never, 'getFeed') as FeedArgs[];
}

function getCachedDetailArgs(getState: () => unknown): string[] {
  return casesApi.util.selectCachedArgsForQuery(getState() as never, 'getCase') as string[];
}

/**
 * Aplica un cambio a un caso en las listas del perfil cacheadas
 * (getUserCases/getSavedCases/getUserVotes). selectCachedArgsForQuery
 * devuelve los arg originales de cada entrada; updateQueryData re-serializa
 * el arg para localizar su cache key (ver getFeed).
 */
function patchListCaches(dispatch: AppDispatch, getState: () => unknown, caseId: string, updater: CaseUpdater) {
  const patchWith = (draft: CaseListResult) => {
    const target = draft.cases.find((c) => c.id === caseId);
    if (target) updater(target);
  };

  const userArgs = casesApi.util.selectCachedArgsForQuery(getState() as never, 'getUserCases') as unknown as UserCaseListArgs[];
  for (const args of userArgs) {
    dispatch(casesApi.util.updateQueryData('getUserCases', args, patchWith));
  }
  const savedArgs = casesApi.util.selectCachedArgsForQuery(getState() as never, 'getSavedCases') as unknown as ProfileCaseListArgs[];
  for (const args of savedArgs) {
    dispatch(casesApi.util.updateQueryData('getSavedCases', args, patchWith));
  }
  const votedArgs = casesApi.util.selectCachedArgsForQuery(getState() as never, 'getUserVotes') as unknown as ProfileCaseListArgs[];
  for (const args of votedArgs) {
    dispatch(casesApi.util.updateQueryData('getUserVotes', args, patchWith));
  }
}

/**
 * Aplica un cambio a un caso en TODAS las entradas cacheadas que lo
 * contienen: feed (getFeed), detalle (getCase — keyed por id o slug) y las
 * listas del perfil. No-op si la cache no existe aún.
 */
function forEachCachedCase(dispatch: AppDispatch, getState: () => unknown, caseId: string, updater: CaseUpdater) {
  for (const args of getCachedFeedArgs(getState)) {
    dispatch(
      casesApi.util.updateQueryData('getFeed', args, (draft) => {
        const target = draft.cases.find((c) => c.id === caseId);
        if (target) updater(target);
      })
    );
  }
  for (const key of getCachedDetailArgs(getState)) {
    dispatch(
      casesApi.util.updateQueryData('getCase', key, (draft) => {
        if (draft.id === caseId) updater(draft);
      })
    );
  }
  patchListCaches(dispatch, getState, caseId, updater);
}

function applyCasePatch(dispatch: AppDispatch, getState: () => unknown, caseId: string, updater: CaseUpdater) {
  forEachCachedCase(dispatch, getState, caseId, updater);
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
 * Incrementa sharesCount en todas las entradas cacheadas (feed, detalle y
 * listas del perfil). Se exporta como thunk para FeedPage (ShareModal).
 */
export function incrementCaseShareCount(caseId: string): ThunkAction<void, RootState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    forEachCachedCase(dispatch as unknown as AppDispatch, getState, caseId, (draft) => {
      draft.sharesCount = (draft.sharesCount ?? 0) + 1;
    });
  };
}

/**
 * Incrementa commentsCount tras publicar un comentario (contador optimista).
 * Se exporta como thunk para ProfilePage y CaseDetailPage.
 */
export function incrementCaseCommentsCount(caseId: string): ThunkAction<void, RootState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    forEachCachedCase(dispatch as unknown as AppDispatch, getState, caseId, (draft) => {
      draft.commentsCount = (draft.commentsCount ?? 0) + 1;
    });
  };
}

// ============================================================
// Hooks generados
// ============================================================

export const {
  useGetFeedQuery,
  useGetCaseQuery,
  useGetUserCasesQuery,
  useGetSavedCasesQuery,
  useGetUserVotesQuery,
  useVoteCaseMutation,
  useRemoveVoteMutation,
  useSaveCaseMutation,
  useReactToCaseMutation,
} = casesApi;