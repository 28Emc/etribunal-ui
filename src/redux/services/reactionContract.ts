/**
 * ============================================
 * redux/services/reactionContract.ts — Contrato de Reacciones
 * ============================================
 *
 * Tipos compartidos del módulo de reacciones (core-domain-service,
 * eTribunal). Tanto casesApi (reacciones a casos) como commentsApi
 * (reacciones a comentarios) usan el mismo endpoint POST /reactions
 * y el mismo payload de respuesta ReactReactionsSummary:
 *
 *   POST /reactions  { target_type: CASE|COMMENT, target_id, emoji }
 *     → { reactions: [{ emoji, count }], user_reaction }
 *
 * `toReactionCounts` normaliza el array a un mapa {LIKE, LOVE, ANGRY}
 * que es el shape del frontend (Case.reactions / CaseComment.reactions).
 */

export type ReactionEmoji = 'LIKE' | 'LOVE' | 'ANGRY';

export type ReactionTarget = 'CASE' | 'COMMENT';

export interface ReactionPayload {
  reactions: Array<{ emoji: ReactionEmoji; count: number }>;
  user_reaction: ReactionEmoji | null;
}

export type ReactionCounts = Record<ReactionEmoji, number>;

/**
 * Convierte el array del backend ({ emoji, count }) en un mapa fijo
 * { LIKE, LOVE, ANGRY } con 0 por defecto para los emojis ausentes.
 */
export function toReactionCounts(reactions: Array<{ emoji: ReactionEmoji; count: number }>): ReactionCounts {
  const counts: ReactionCounts = { LIKE: 0, LOVE: 0, ANGRY: 0 };
  for (const reaction of reactions) {
    if (counts[reaction.emoji] !== undefined) {
      counts[reaction.emoji] = reaction.count;
    }
  }
  return counts;
}