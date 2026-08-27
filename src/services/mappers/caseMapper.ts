/**
 * ============================================
 * services/mappers/caseMapper.ts — Mapeo DB → Frontend
 * ============================================
 *
 * ¿Por qué existe este mapper?
 *   El backend (NestJS + Prisma) devuelve datos en snake_case
 *   y con estructuras relacionales. El frontend necesita
 *   camelCase y estructuras normalizadas. Este mapper
 *   transforma un formato en el otro.
 *
 * ¿Qué hace exactamente?
 *   1. Renombra campos: created_at → createdAt
 *   2. Normaliza: reacciones en formato array → mapa {LIKE, LOVE, ANGRY}
 *   3. Enriquece: aplica lógica de anonimato (getDisplayName)
 *   4. Filtra: imágenes de Side A vs Side B
 *   5. Fallbacks: valores por defecto cuando el backend no envía algo
 *
 * ¿Por qué no tipar la respuesta del backend directamente?
 *   Porque la API puede devolver campos opcionales o en diferentes
 *   formatos (ej: reacciones como array legacy o como summary nuevo).
 *   El mapper unifica todo a un formato consistente.
 */

import type { Case, CaseComment, ReactionType } from '@typings/index';
import { getDisplayName, getAnonymousAvatar } from '@services/anonymity';

// ============================================================
// mapDbCommentToComment
// ============================================================

/**
 * Transforma un comentario crudo del backend (formato DB)
 * al formato CaseComment del frontend.
 *
 * Maneja dos formatos de reacciones:
 *   - Legacy:  reactions: [{ emoji: 'LIKE', user_id: 'x' }]
 *   - Nuevo:   reactions_summary: { counts: { LIKE: 5 } }, user_reaction: 'LIKE'
 *
 * @param dbComment - Objeto crudo del backend
 * @param currentUserId - ID del usuario actual (para marcar isOwner)
 * @returns CaseComment normalizado
 */
export const mapDbCommentToComment = (
  dbComment: any,
  currentUserId?: string
): CaseComment => {
  // Inicializar mapa de reacciones con valores en 0
  const reactionsMap: Record<string, number> = {
    LIKE: 0,
    LOVE: 0,
    ANGRY: 0,
  };

  // Variable para la reacción del usuario actual
  let userReaction: ReactionType | null = null;

  // ============================================================
  // Paso 1: Procesar reacciones en formato legacy (array de objetos)
  // Este formato se usaba antes de la optimización del backend.
  // ============================================================
  if (dbComment.reactions && Array.isArray(dbComment.reactions)) {
    for (const r of dbComment.reactions) {
      // Incrementar el contador para este tipo de reacción
      reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;

      // Si esta reacción es del usuario actual, guardarla
      if (currentUserId && r.user_id === currentUserId) {
        userReaction = r.emoji as ReactionType;
      }
    }
  }

  // ============================================================
  // Paso 2: Si existe el formato optimizado (reactions_summary),
  // usarlo en vez del legacy
  // ============================================================
  const reactionsSummary =
    dbComment.reactions_summary?.counts || reactionsMap;
  const currentUserReaction = dbComment.user_reaction || userReaction;

  // ============================================================
  // Paso 3: Determinar identidad del comentarista (anonimato)
  // ============================================================
  const commentUserId = dbComment.user?.id;
  const commentUserAnonymous =
    dbComment.user?.is_anonymous || dbComment.is_anonymous;

  return {
    id: dbComment.id,
    user: getDisplayName(
      dbComment.user?.username || dbComment.username,
      commentUserAnonymous,
      commentUserId
    ),
    userId: commentUserId,
    avatar: commentUserAnonymous
      ? getAnonymousAvatar(commentUserId)
      : dbComment.user?.avatar_url ||
        dbComment.avatar_url ||
        'https://picsum.photos/seed/user123/100/100',
    text: dbComment.content || dbComment.text || '',
    timestamp: dbComment.created_at || dbComment.timestamp,

    // reactions_summary ya está en el formato que necesita el frontend
    reactions: reactionsSummary,
    userReaction: currentUserReaction,

    likes: dbComment.likes_count || 0,

    // isOwner: true si el comentario es del usuario actual
    isOwner: !!currentUserId && commentUserId === currentUserId,

    contentLanguage: dbComment.content_language || undefined,

    // Mapear replies recursivamente (1 nivel de profundidad)
    replies: dbComment.replies
      ? dbComment.replies.map((r: any) =>
          mapDbCommentToComment(r, currentUserId)
        )
      : [],
  };
};

// ============================================================
// mapDbCaseToCase
// ============================================================

/**
 * Transforma un caso crudo del backend al formato Case del frontend.
 *
 * Es el mapper principal de la aplicación. Se llama desde:
 *   - useCases (feed)
 *   - useCase (detalle)
 *   - useProfile (perfil del usuario)
 *   - useSavedCases (casos guardados)
 *
 * @param dbCase - Objeto crudo del backend
 * @param currentUserId - ID del usuario actual
 * @returns Case normalizado
 */
export const mapDbCaseToCase = (
  dbCase: any,
  currentUserId?: string
): Case => {
  // ============================================================
  // Separar imágenes por Side
  // ============================================================
  const sideAImages =
    dbCase.images?.filter((img: any) => (img.side || 'A') === 'A') || [];
  const sideBImages =
    dbCase.images?.filter((img: any) => img.side === 'B') || [];

  // ============================================================
  // Procesar reacciones (formato legacy → mapa)
  // ============================================================
  const reactionsMap: Record<string, number> = {
    LIKE: 0,
    LOVE: 0,
    ANGRY: 0,
  };
  if (dbCase.reactions && Array.isArray(dbCase.reactions)) {
    for (const r of dbCase.reactions) {
      reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
    }
  }

  return {
    id: dbCase.id,
    title: dbCase.title,
    category: dbCase.category || 'Other',

    // Asegurar que type y status sean valores válidos
    type: (dbCase.type === 'classic' ? 'classic' : 'vote') as
      | 'vote'
      | 'classic',
    status: (dbCase.status || 'PUBLIC') as 'PUBLIC' | 'WAITING' | 'CLOSED',

    inviteToken: dbCase.invite_token || null,
    inviteUrl: dbCase.invite_url || null,

    // userIds (pueden venir como field directo o como relación)
    sideAUserId: dbCase.side_a_user_id || dbCase.side_a_user?.id,
    sideBUserId:
      dbCase.side_b_user_id || dbCase.side_b_user?.id || null,

    // ============================================================
    // Side A
    // ============================================================
    sideA: {
      name: getDisplayName(
        dbCase.side_a_user?.username,
        dbCase.side_a_user?.is_anonymous,
        dbCase.side_a_user?.id
      ),
      username: dbCase.side_a_user?.username,
      avatar: dbCase.side_a_user?.is_anonymous
        ? getAnonymousAvatar(dbCase.side_a_user?.id)
        : dbCase.side_a_user?.avatar_url ||
          'https://picsum.photos/seed/user123/100/100',
      story: dbCase.side_a_content,
      evidence: sideAImages.map((img: any) => ({
        id: img.id,
        url: img.url,
        caption: '',
      })),
    },

    // ============================================================
    // Side B
    // ============================================================
    sideB: {
      name:
        getDisplayName(
          dbCase.side_b_user?.username,
          dbCase.side_b_user?.is_anonymous || dbCase.is_anonymous,
          dbCase.side_b_user?.id
        ) || 'Esperando...',
      username: dbCase.side_b_user?.username || undefined,
      avatar: (dbCase.side_b_user?.is_anonymous || dbCase.is_anonymous)
        ? getAnonymousAvatar(dbCase.side_b_user?.id)
        : dbCase.side_b_user?.avatar_url ||
          'https://picsum.photos/seed/waiting/100/100',
      story: dbCase.side_b_content || 'Esperando respuesta...',
      evidence: sideBImages.map((img: any) => ({
        id: img.id,
        url: img.url,
        caption: '',
      })),
    },

    // ============================================================
    // Conteos
    // ============================================================
    votesA: dbCase.votes_a || 0,
    votesB: dbCase.votes_b || 0,
    votesBothWrong: dbCase.votes_both_wrong || 0,

    tags: dbCase.category ? [dbCase.category] : [],
    createdAt: dbCase.created_at,
    contentLanguage: dbCase.content_language || undefined,

    // Subtítulos personalizados para botones de votación
    sideASubtitle: dbCase.side_a_subtitle || null,
    sideBSubtitle: dbCase.side_b_subtitle || null,
    bothWrongSubtitle: dbCase.both_wrong_subtitle || null,

    // Reacciones (usar formato optimizado si existe, si no el legacy)
    reactions: dbCase.reactions_summary?.counts || reactionsMap,
    userReaction: dbCase.user_reaction || null,

    // Flags de interacción del usuario actual
    isSaved: dbCase.is_saved || dbCase.isSaved || false,
    isShared: dbCase.is_shared || dbCase.isShared || false,

    // Conteos con múltiples nombres de campos posibles (compatibilidad)
    anchorsCount:
      dbCase.total_anchors ||
      dbCase.anchorsCount ||
      dbCase.saved_count ||
      dbCase.savedCount ||
      0,
    sharesCount:
      dbCase.total_shares ||
      dbCase.shares_count ||
      dbCase.sharesCount ||
      0,
    commentsCount:
      dbCase.comments_count || dbCase.commentsCount || 0,

    // Comentarios (mapeados recursivamente)
    comments: (dbCase.comments || []).map((c: any) =>
      mapDbCommentToComment(c, currentUserId)
    ),

    // Estado de moderación
    report_status: dbCase.report_status || 'NONE',
    moderation_status: dbCase.moderation_status || 'PENDING',
    reports: dbCase.reports || [],
    report_reason: dbCase.report_reason || null,
  };
};
