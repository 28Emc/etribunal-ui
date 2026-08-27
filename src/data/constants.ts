/**
 * ============================================
 * data/constants.ts — Constantes Globales
 * ============================================
 *
 * Propósito:
 *   Centralizar todas las constantes de la aplicación
 *   para evitar magic numbers/strings dispersos en el código.
 *
 * Nota:
 *   Los objetos se marcan con 'as const' para que TypeScript
 *   infiera los LITERAL TYPES en vez de solo 'string'.
 *   Esto permite type safety más estricto.
 */

// ============================================================
// API
// ============================================================

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000,
} as const;

// ============================================================
// Paginación
// ============================================================

export const PAGINATION = {
  /** Cantidad de items por página en el feed */
  DEFAULT_PAGE_SIZE: 20,
  /** Límite máximo permitido */
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================
// Tipos de Caso
// ============================================================

export const CASE_TYPES = {
  CLASSIC: 'classic',
  VOTE: 'vote',
} as const;

// ============================================================
// Estados de Caso
// ============================================================

export const CASE_STATUS = {
  /** Esperando respuesta de Side B */
  WAITING: 'WAITING',
  /** Abierto a votos y comentarios */
  PUBLIC: 'PUBLIC',
  /** Cerrado (no se aceptan más interacciones) */
  CLOSED: 'CLOSED',
} as const;

// ============================================================
// Tabs del Feed
// ============================================================

export const FEED_TABS = {
  FOR_YOU: 'for_you',
  FOLLOWING: 'following',
  TRENDING: 'trending',
} as const;

// ============================================================
// Categorías
// ============================================================

export const CATEGORIES = [
  'Justice',
  'Ethics',
  'Relationships',
  'Work',
  'Social',
  'Legal',
  'Other',
] as const;

// ============================================================
// Reacciones
// ============================================================

export const REACTIONS = {
  LIKE: 'LIKE',
  LOVE: 'LOVE',
  ANGRY: 'ANGRY',
} as const;

// ============================================================
// Storage Keys (localStorage / sessionStorage)
// ============================================================

export const STORAGE_KEYS = {
  TOKEN: 'etribunal_token',
  USER: 'etribunal_user',
  THEME: 'etribunal_theme',
  SEARCH_TYPE: 'etribunal_search_type',
} as const;

// ============================================================
// Tema
// ============================================================

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;
