/**
 * ============================================
 * types/index.ts — Interfaces y Tipos Globales
 * ============================================
 *
 * Propósito:
 *   Define TODAS las interfaces y tipos que se usan
 *   a través de la aplicación. Centralizar los tipos
 *   evita imports circulares y facilita el mantenimiento.
 *
 * Convención:
 *   - Interfaces: PascalCase (User, Case, etc.)
 *   - Type aliases: PascalCase también (CaseType, VoteSide, etc.)
 *   - Props de componentes: se definen en el mismo archivo del componente
 *
 * Relación con el backend:
 *   Estas interfaces reflejan la respuesta JSON que devuelve
 *   la API de NestJS. El mapper (services/mappers/caseMapper.ts)
 *   transforma los nombres snake_case del backend a camelCase
 *   del frontend.
 */

// ============================================================
// Usuario
// ============================================================

/**
 * Representa un usuario del sistema.
 * Los campos marcados como opcionales pueden venir del backend
 * dependiendo del endpoint (profile completo vs search result).
 */
export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  bio?: string;

  /** IDs de los casos que el usuario ha creado */
  casesCreated: string[];

  /** Mapa caseId → voto del usuario */
  votes: Record<string, 'A' | 'B' | 'BOTH_WRONG'>;

  followersCount?: number;
  followingCount?: number;
  casesCount?: number;

  /** Indica si el usuario actual sigue a este usuario */
  is_following?: boolean;
  is_anonymous?: boolean;
  receive_notifications?: boolean;

  /** true si el usuario tiene contraseña (no solo social login) */
  hasPassword?: boolean;
  language?: string;

  /** Nivel de permisos */
  role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'SYSADMIN';
}

// ============================================================
// Evidencia (imágenes de un caso)
// ============================================================

export interface Evidence {
  id: string;
  url: string;
  caption?: string;
}

// ============================================================
// Side (lado A o B de un caso)
// ============================================================

/**
 * Cada caso tiene dos "lados": Side A (creador) y Side B (respondedor).
 * Contiene la historia, el usuario y las evidencias.
 */
export interface Side {
  name: string;
  username?: string;
  avatar: string;

  /** Si el usuario optó por publicar este lado de forma anónima */
  isAnonymous?: boolean;

  /** Texto de la historia / argumento del lado */
  story: string;

  /** Imágenes que respaldan este lado (máximo 5) */
  evidence: Evidence[];
}

// ============================================================
// Comentario de un caso
// ============================================================

export interface CaseComment {
  id: string;
  user: string;
  userId?: string;
  avatar: string;
  text: string;

  /** Timestamp para mostrar al usuario (relativo: "hace 5min") */
  timestamp: string;

  /** Timestamp ISO original para ordenamiento */
  createdAt?: string;

  likes?: number;

  /** Mapa de conteos por tipo de reacción */
  reactions?: { LIKE: number; LOVE: number; ANGRY: number };

  /** Reacción del usuario actual a este comentario */
  userReaction?: string | null;

  /** Replies anidados (1 nivel de profundidad) */
  replies?: CaseComment[];
  replies_count?: number;
  reactions_count?: number;
  isOwner?: boolean;
  isNew?: boolean;

  /** Idioma original del contenido (para traducción) */
  contentLanguage?: string;
}

// ============================================================
// Caso
// ============================================================

/**
 * Entidad principal de la aplicación.
 * Representa un caso con dos partes (Side A y Side B)
 * que la comunidad puede votar y comentar.
 */
export interface Case {
  id: string;
  title: string;
  category: string;

  /** 'vote' = votación A/B, 'classic' = debate abierto */
  type?: 'vote' | 'classic';

  /** Estado del caso */
  status?: 'PUBLIC' | 'WAITING' | 'CLOSED';

  inviteToken?: string | null;
  inviteUrl?: string | null;
  sideAUserId?: string;
  sideBUserId?: string | null;

  sideA: Side;
  sideB: Side;

  /** Conteo de votos */
  votesA: number;
  votesB: number;
  votesBothWrong: number;

  comments: CaseComment[];
  commentsCount?: number;
  tags: string[];

  /** ISO date string */
  createdAt: string;

  /** Subtítulos personalizados para los botones de votación */
  sideASubtitle?: string | null;
  sideBSubtitle?: string | null;
  bothWrongSubtitle?: string | null;

  /** Mapa de reacciones (conteos) */
  reactions?: { LIKE: number; LOVE: number; ANGRY: number };

  /** Reacción del usuario actual */
  userReaction?: string | null;

  /** Flags de interacción del usuario actual */
  isSaved?: boolean;
  isShared?: boolean;
  contentLanguage?: string;

  /** Conteos de interacciones */
  anchorsCount?: number;
  sharesCount?: number;

  /** Estado de moderación */
  report_status?: 'NONE' | 'REPORTED' | 'RESOLVED';
  moderation_status?: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REJECTED';
  reports?: CaseReport[];
  report_reason?: string | null;
}

// ============================================================
// Reporte (moderación)
// ============================================================

export interface CaseReport {
  id: string;
  reason: string;
  created_at: string;
  reporter: { id: string; username: string };
}

// ============================================================
// Resultado de búsqueda de usuarios
// ============================================================

export interface UserSearchResult {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_anonymous?: boolean;
  followers_count?: number;
  cases_count?: number;
}

// ============================================================
// Type Aliases
// ============================================================

export type CaseType = 'vote' | 'classic';
export type CaseStatus = 'PUBLIC' | 'WAITING' | 'CLOSED';
export type VoteSide = 'A' | 'B' | 'BothWrong';

/** Tabs del feed principal */
export type FeedTab = 'for_you' | 'following' | 'trending';

/** Tipos de reacción disponibles */
export type ReactionType = 'LIKE' | 'LOVE' | 'ANGRY';
