/**
 * ============================================
 * redux/services/commentsApi.ts — RTK Query API de Comentarios
 * ============================================
 *
 * ¿Qué es?
 *   Fuente de verdad única del módulo de comentarios en el detalle de
 *   caso. Reemplaza hooks/useComments (estado local + polling manual).
 *
 * Contrato (core-domain-service, eTribunal):
 *   GET  /cases/:caseId/comments?before=&after=&limit=
 *     → { data: CommentResponse[], next_cursor, has_more }
 *   GET  /cases/:caseId/comments/new?since=ISO
 *     → count (número)
 *   POST /cases/:caseId/comments            { content, parent_id? } → CommentResponse
 *   PUT  /comments/:commentId               { content }            → CommentResponse
 *   DELETE /comments/:commentId             → void
 *   GET  /comments/:commentId/replies       → CommentResponse[]
 *
 * ¿Cómo funciona la paginación por cursor?
 *   - Una sola entrada de cache por caseId (serializeQueryArgs).
 *   - El feed se mantiene newest-first.
 *   - Cargar más viejos  → initiate con `before` → merge APPENDE al final.
 *   - Mostrar nuevos     → initiate con `after`  → merge PREPENDE al inicio
 *     (conserva hasMore/nextCursor de la dirección "vieja").
 *
 * ¿Polling de comentarios nuevos?
 *   getNewCommentsCount expone `{ count }`. El hook useCommentsData lo
 *   suscribe con pollingInterval 15s + skipPollingIfUnfocused (pestaña
 *   oculta) y pausa el polling mientras hay comentarios por mostrar.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import type { ThunkAction } from '@reduxjs/toolkit';
import type { UnknownAction } from 'redux';
import type { RootState } from '../store';
import { authStorage } from '@api/client';
import type { CaseComment } from '@typings/index';
import { mapDbCommentToComment } from '@services/mappers/caseMapper';
import { baseQuery } from './rtkApiClient';

// ============================================================
// Constantes
// ============================================================

export const COMMENTS_PAGE_SIZE = 20;
export const NEW_COMMENTS_LIMIT = 50;

// ============================================================
// Tipos públicos
// ============================================================

/**
 * Args de getComments. `caseId` es la clave de cache única; `before`/
 * `after`/`limit` solo disparan refetch + merge direccional.
 */
export interface CommentsArgs {
  caseId: string;
  before?: string;
  after?: string;
  limit?: number;
}

export interface CommentsResult {
  comments: CaseComment[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NewCommentsCountArgs {
  caseId: string;
  since: string;
}

// ============================================================
// Normalizadores (contrato CommentPage del backend: snake_case)
// ============================================================

interface RawCommentPage {
  data?: unknown;
  next_cursor?: string | null;
  has_more?: boolean;
}

function normalizeCommentPage(raw: unknown): CommentsResult {
  const page = (raw ?? {}) as RawCommentPage;
  const currentUserId = authStorage.getUserId() ?? undefined;
  const comments = Array.isArray(page.data)
    ? page.data.map((item) =>
        mapDbCommentToComment(item as Record<string, unknown>, currentUserId)
      )
    : [];
  return {
    comments,
    nextCursor: typeof page.next_cursor === 'string' ? page.next_cursor : null,
    hasMore: page.has_more === true,
  };
}

function normalizeComment(raw: unknown): CaseComment {
  return mapDbCommentToComment(
    (raw ?? {}) as Record<string, unknown>,
    authStorage.getUserId() ?? undefined
  );
}

// ============================================================
// API
// ============================================================

export const commentsApi = createApi({
  reducerPath: 'commentsApi',
  baseQuery,
  tagTypes: ['Comment'],
  endpoints: (builder) => ({
    /**
     * Comentarios top-level newest-first con paginación por cursor.
     * Una sola entrada de cache por caseId; las páginas viejas se
     * anexan al final y las nuevas se anteponen al inicio.
     */
    getComments: builder.query<CommentsResult, CommentsArgs>({
      query: ({ caseId, before, after, limit }) => ({
        url: `/cases/${caseId}/comments`,
        params: {
          before: before ?? undefined,
          after: after ?? undefined,
          limit: limit ?? COMMENTS_PAGE_SIZE,
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => queryArgs.caseId,
      transformResponse: (raw: unknown) => normalizeCommentPage(raw),
      merge: (cache, incoming, { arg }) => {
        // Lista newest-first. La página que viene con `after` son los
        // comentarios MÁS NUEVOS → van arriba. Las páginas `before`
        // (más viejas) van al final.
        const existingIds = new Set(cache.comments.map((c) => c.id));
        const fresh = incoming.comments.filter((c) => !existingIds.has(c.id));
        if (arg.after) {
          cache.comments = [...fresh, ...cache.comments];
        } else {
          cache.comments = [...cache.comments, ...fresh];
          cache.hasMore = incoming.hasMore;
          cache.nextCursor = incoming.nextCursor;
        }
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        !!currentArg &&
        !!previousArg &&
        (!!currentArg.before || !!currentArg.after) &&
        (currentArg.before !== previousArg.before ||
          currentArg.after !== previousArg.after),
      providesTags: (result) =>
        result
          ? result.comments.map((c) => ({ type: 'Comment' as const, id: c.id }))
          : [],
    }),

    /**
     * Cantidad de comentarios nuevos desde un timestamp (polling).
     */
    getNewCommentsCount: builder.query<{ count: number }, NewCommentsCountArgs>({
      query: ({ caseId, since }) => ({
        url: `/cases/${caseId}/comments/new`,
        params: { since },
      }),
      transformResponse: (raw: unknown) => ({
        count: typeof raw === 'number' ? raw : 0,
      }),
    }),

    /**
     * Crear un comentario (o respuesta). Al completar, inserta el
     * resultado arriba de la cache del caso (patrón "append a lo nuevo").
     */
    addComment: builder.mutation<
      CaseComment,
      { caseId: string; content: string; parentId?: string }
    >({
      query: ({ caseId, content, parentId }) => ({
        url: `/cases/${caseId}/comments`,
        method: 'POST',
        body: {
          content,
          ...(parentId ? { parent_id: parentId } : {}),
        },
      }),
      transformResponse: (raw: unknown) => normalizeComment(raw),
      async onQueryStarted({ caseId }, { dispatch, queryFulfilled }) {
        try {
          const { data: newComment } = await queryFulfilled;
          dispatch(
            commentsApi.util.updateQueryData('getComments', { caseId }, (draft) => {
              draft.comments = [newComment, ...draft.comments];
            })
          );
        } catch {
          // El error se propaga al caller; la cache queda sin cambios.
        }
      },
    }),

    /**
     * Editar el contenido de un comentario (top-level o respuesta).
     */
    updateComment: builder.mutation<
      CaseComment,
      { commentId: string; content: string }
    >({
      query: ({ commentId, content }) => ({
        url: `/comments/${commentId}`,
        method: 'PUT',
        body: { content },
      }),
      transformResponse: (raw: unknown) => normalizeComment(raw),
      async onQueryStarted({ commentId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(
            updateMatchingComment(commentId, (draft) => {
              draft.text = updated.text;
              draft.timestamp = updated.timestamp;
            })
          );
        } catch {
          // El error se propaga al caller; la cache queda sin cambios.
        }
      },
    }),

    /**
     * Eliminar un comentario (top-level o respuesta).
     */
    deleteComment: builder.mutation<void, { commentId: string }>({
      query: ({ commentId }) => ({
        url: `/comments/${commentId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ commentId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(removeMatchingComment(commentId));
        } catch {
          // El error se propaga al caller; la cache queda sin cambios.
        }
      },
    }),

    /**
     * Respuestas de un comentario (1 nivel de profundidad).
     */
    getReplies: builder.query<CaseComment[], string>({
      query: (commentId) => ({ url: `/comments/${commentId}/replies` }),
      transformResponse: (raw: unknown) => {
        const currentUserId = authStorage.getUserId() ?? undefined;
        return Array.isArray(raw)
          ? raw.map((item) =>
              mapDbCommentToComment(item as Record<string, unknown>, currentUserId)
            )
          : [];
      },
    }),
  }),
});

// ============================================================
// Helpers de parcheo de cache (buscan en todas las entradas)
// ============================================================

type CommentUpdater = (draft: CaseComment) => void;

function patchCommentInList(
  comments: CaseComment[],
  commentId: string,
  updater: CommentUpdater
): boolean {
  for (const comment of comments) {
    if (comment.id === commentId) {
      updater(comment);
      return true;
    }
    if (comment.replies && patchCommentInList(comment.replies, commentId, updater)) {
      return true;
    }
  }
  return false;
}

function dropCommentFromList(
  comments: CaseComment[],
  commentId: string
): boolean {
  for (let i = 0; i < comments.length; i++) {
    if (comments[i].id === commentId) {
      comments.splice(i, 1);
      return true;
    }
    if (
      comments[i].replies &&
      dropCommentFromList(comments[i].replies!, commentId)
    ) {
      return true;
    }
  }
  return false;
}

function getCachedCommentArgs(getState: () => RootState): CommentsArgs[] {
  return commentsApi.util.selectCachedArgsForQuery(
    getState() as never,
    'getComments'
  ) as unknown as CommentsArgs[];
}

/**
 * Actualiza el texto/timestamp de un comentario en todas las entradas
 * de cache de getComments (top-level o anidado en replies).
 */
export function updateMatchingComment(
  commentId: string,
  updater: CommentUpdater
): ThunkAction<void, RootState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    for (const args of getCachedCommentArgs(getState)) {
      dispatch(
        commentsApi.util.updateQueryData('getComments', args, (draft) => {
          patchCommentInList(draft.comments, commentId, updater);
        })
      );
    }
  };
}

/**
 * Elimina un comentario (top-level o anidado) de todas las entradas
 * de cache de getComments.
 */
export function removeMatchingComment(
  commentId: string
): ThunkAction<void, RootState, unknown, UnknownAction> {
  return (dispatch, getState) => {
    for (const args of getCachedCommentArgs(getState)) {
      dispatch(
        commentsApi.util.updateQueryData('getComments', args, (draft) => {
          dropCommentFromList(draft.comments, commentId);
        })
      );
    }
  };
}

// ============================================================
// Hooks generados
// ============================================================

export const {
  useGetCommentsQuery,
  useGetNewCommentsCountQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useGetRepliesQuery,
} = commentsApi;