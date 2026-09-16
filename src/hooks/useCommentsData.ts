/**
 * ============================================
 * hooks/useCommentsData.ts — Orquestación de comentarios con RTK Query
 * ============================================
 *
 * Reemplaza hooks/useComments (estado local). Fuente de datos:
 * commentsApi (RTK Query), con una sola entrada de cache por caseId.
 *
 * ¿Qué orquesta?
 *   - getComments: página inicial + páginas anteriores (before) +
 *     comentarios nuevos (after) vía comentariosApi.
 *   - getNewCommentsCount: polling cada 15s (pausado si la pestaña está
 *     oculta o mientras hay comentarios por mostrar).
 *   - Mutaciones addComment/updateComment/deleteComment, con parcheo
 *     automático de la cache por commentsApi.
 */

import { useCallback, useEffect, useState } from 'react';
import type { CaseComment } from '@typings/index';
import { useAppDispatch } from '@redux/hooks';
import {
  COMMENTS_PAGE_SIZE,
  NEW_COMMENTS_LIMIT,
  commentsApi,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetCommentsQuery,
  useGetNewCommentsCountQuery,
  useUpdateCommentMutation,
} from '@redux/services/commentsApi';

export interface UseCommentsDataReturn {
  visibleComments: CaseComment[];
  pendingCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  isFetching: boolean;
  addComment: (
    caseId: string,
    content: string,
    parentId?: string
  ) => Promise<CaseComment>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  fetchOlderComments: (caseId: string) => void;
  showNewComments: () => void;
  hideNewCommentsIndicator: () => void;
}

const NEW_COMMENTS_POLL_MS = 15_000;

export function useCommentsData(
  caseId?: string
): UseCommentsDataReturn {
  const dispatch = useAppDispatch();

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSince, setPendingSince] = useState<string | null>(null);

  // Al cambiar de caso se limpia el estado de "comentarios nuevos"
  // pendientes para no arrastrarlos entre detalles.
  useEffect(() => {
    setPendingCount(0);
    setPendingSince(null);
  }, [caseId]);

  // ============================================================
  // Lista de comentarios (página inicial + paginación por cursor)
  // ============================================================
  const {
    data,
    isFetching,
  } = useGetCommentsQuery(
    { caseId: caseId ?? '', limit: COMMENTS_PAGE_SIZE },
    { skip: !caseId }
  );

  const visibleComments = data?.comments ?? [];
  const hasMore = data?.hasMore ?? false;
  const nextCursor = data?.nextCursor ?? null;

  // El comentario más nuevo visible define el cursor `since` de polling.
  const newestTimestamp =
    visibleComments.length > 0 ? visibleComments[0].createdAt : undefined;

  // ============================================================
  // Polling de comentarios nuevos (15s, pausado con pendientes)
  // ============================================================
  const { data: newCountData } = useGetNewCommentsCountQuery(
    { caseId: caseId ?? '', since: newestTimestamp ?? '' },
    {
      skip: !caseId || !newestTimestamp,
      pollingInterval:
        caseId && newestTimestamp && pendingCount === 0
          ? NEW_COMMENTS_POLL_MS
          : 0,
      skipPollingIfUnfocused: true,
    }
  );

  // El contador solo puede ser > 0 mientras estamos mostrando
  // comentarios que aún no aparecen en pantalla (sin pendientes).
  useEffect(() => {
    const count = newCountData?.count ?? 0;
    if (count > 0) {
      setPendingCount(count);
      setPendingSince(newestTimestamp ?? null);
    }
  }, [newCountData?.count, newestTimestamp]);

  // ============================================================
  // Acciones
  // ============================================================

  const loadOlderSub = useCallback(
    (caseIdToLoad: string, before: string) => {
      const result = dispatch(
        commentsApi.endpoints.getComments.initiate({
          caseId: caseIdToLoad,
          before,
          limit: COMMENTS_PAGE_SIZE,
        })
      );
      result.unsubscribe();
    },
    [dispatch]
  );

  const fetchOlderComments = useCallback(
    (caseIdToLoad: string) => {
      if (!nextCursor || isFetching) return;
      loadOlderSub(caseIdToLoad, nextCursor);
    },
    [nextCursor, isFetching, loadOlderSub]
  );

  const showNewComments = useCallback(() => {
    if (!caseId || !pendingSince) return;
    const since = pendingSince;
    setPendingCount(0);
    setPendingSince(null);
    const result = dispatch(
      commentsApi.endpoints.getComments.initiate({
        caseId,
        after: since,
        limit: NEW_COMMENTS_LIMIT,
      })
    );
    result.unsubscribe();
  }, [dispatch, caseId, pendingSince]);

  const hideNewCommentsIndicator = useCallback(() => {
    setPendingCount(0);
    setPendingSince(null);
  }, []);

  const [runAddComment] = useAddCommentMutation();
  const addComment = useCallback(
    async (caseIdTarget: string, content: string, parentId?: string) => {
      return runAddComment({ caseId: caseIdTarget, content, parentId }).unwrap();
    },
    [runAddComment]
  );

  const [runUpdateComment] = useUpdateCommentMutation();
  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      await runUpdateComment({ commentId, content }).unwrap();
    },
    [runUpdateComment]
  );

  const [runDeleteComment] = useDeleteCommentMutation();
  const deleteComment = useCallback(
    async (commentId: string) => {
      await runDeleteComment({ commentId }).unwrap();
    },
    [runDeleteComment]
  );

  return {
    visibleComments,
    pendingCount,
    hasMore,
    nextCursor,
    isFetching,
    addComment,
    updateComment,
    deleteComment,
    fetchOlderComments,
    showNewComments,
    hideNewCommentsIndicator,
  };
}