/**
 * ============================================
 * redux/services/usersApi.ts — RTK Query API de Usuarios
 * ============================================
 *
 * ¿Qué es?
 *   Fuente de verdad única del dominio de usuarios del feed: top judges
 *   y follow/unfollow. Reemplaza las llamadas apiClient directas que vivían
 *   en FeedPage (fetchTopJudges + handleFollowUser).
 *
 * ¿Cómo se mantiene coherente el seguimiento?
 *   - getTopJudges cachea la lista con una sola entrada (arg void).
 *   - followUser actualiza la cache optimistamente en onQueryStarted
 *     (flip is_following + ajuste de followers_count) y revierte el patch
 *     si el POST falla. No hace falta refetch manual tras seguir.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './rtkApiClient';

// ============================================================
// Tipos públicos
// ============================================================

/** Juez del ranking de top judges (shape de GET /users/top-judges). */
export interface TopJudge {
  id: string;
  username: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  followers_count: number;
  is_following: boolean;
}

export interface FollowPayload {
  following: boolean;
}

// ============================================================
// API
// ============================================================

/** Tamaño solicitado al backend en GET /users/top-judges (param `limit`). */
const TOP_JUDGES_LIMIT = 20;

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery,
  tagTypes: ['TopJudge'],
  endpoints: (builder) => ({
    /**
     * Ranking de jueces. El backend lee `limit` (no `take`); sin auth cada
     * fila trae `is_following: false`.
     */
    getTopJudges: builder.query<TopJudge[], void>({
      query: () => ({ url: '/users/top-judges', params: { limit: TOP_JUDGES_LIMIT } }),
      transformResponse: (raw: unknown): TopJudge[] => {
        const list = Array.isArray(raw) ? raw : [];
        return list.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            id: String(row.id),
            username: String(row.username),
            avatar_url: (row.avatar_url as string | null) ?? null,
            is_anonymous: row.is_anonymous === true,
            followers_count: Number(row.followers_count ?? 0),
            is_following: row.is_following === true,
          };
        });
      },
      providesTags: (result) =>
        result ? result.map((u) => ({ type: 'TopJudge' as const, id: u.id })) : [],
    }),

    /**
     * Toggle follow/unfollow. Actualiza la cache de getTopJudges de forma
     * optimista (flip is_following y followers_count); si el POST falla se
     * revierte el patch y el error llega al caller.
     */
    followUser: builder.mutation<FollowPayload, { username: string }>({
      query: ({ username }) => ({ url: `/users/${username}/follow`, method: 'POST', body: {} }),
      async onQueryStarted({ username }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getTopJudges', undefined, (draft) => {
            const judge = draft.find((u) => u.username === username);
            if (judge) {
              judge.is_following = !judge.is_following;
              judge.followers_count += judge.is_following ? 1 : -1;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

// ============================================================
// Hooks generados
// ============================================================

export const {
  useGetTopJudgesQuery,
  useFollowUserMutation,
} = usersApi;