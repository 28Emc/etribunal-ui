/**
 * ============================================
 * utils/helpers.ts — Funciones Utilitarias
 * ============================================
 *
 * ¿Qué contiene?
 *   Funciones PURAS (sin efectos secundarios) que se usan
 *   en toda la aplicación. No importan React, solo utilidades
 *   de transformación de datos.
 *
 * Diferencia con services/:
 *   utils  = funciones genéricas sin lógica de negocio
 *   services = funciones con lógica específica del dominio
 *
 * Ejemplos de uso:
 *   cn()          → combinar clases CSS condicionalmente
 *   formatNumber() → mostrar números compactos (1K, 2.5M)
 *   createSlug()  → generar URLs amigables para SEO
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from '@services/i18n';

/**
 * ============================================
 * cn — classnames utility
 * ============================================
 *
 * Combina clsx + tailwind-merge para manejar clases
 * condicionales sin conflictos de Tailwind.
 *
 * ¿Por qué no usar solo clsx?
 *   Tailwind genera clases como "p-4" y "p-6" que entran
 *   en conflicto. tailwind-merge resuelve estos conflictos
 *   quedándose con la última clase.
 *
 * Ejemplo:
 *   cn('p-4', 'p-6') → 'p-6' (no 'p-4 p-6')
 *   cn('text-red-500', isActive && 'text-blue-500') → condicional
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ============================================
 * formatNumber — Formato numérico compacto
 * ============================================
 *
 * Convierte números grandes a formato legible:
 *   1.000 → "1K"
 *   2.500.000 → "2.5M"
 *   123 → "123"
 *
 * ¿Por qué no usar Intl.NumberFormat?
 *   Este formato es más compacto visualmente,
 *   ideal para contadores en tarjetas.
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * ============================================
 * formatRelativeCaseDate — Fecha relativa i18n-aware
 * ============================================
 *
 * Muestra la fecha de un caso en formato relativo:
 *   "justo ahora"
 *   "hace 5 minutos" / "5 minutes ago"
 *   "hace 3 horas"
 *   "hace 2 días"
 *   "15 Jun 2024" (para fechas > 7 días)
 *
 * Usa i18n para las traducciones.
 */
export function formatRelativeCaseDate(
  value: string | Date,
  locale?: string
) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const currentLocale = locale || i18n.language || 'es';

  if (diffMs < 60_000) return i18n.t('time.justNow');

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return i18n.t('time.minutesAgo', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) {
    return i18n.t('time.hoursAgo', { count: diffHours });
  }

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) {
    return i18n.t('time.daysAgo', { count: diffDays });
  }

  return new Intl.DateTimeFormat(currentLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * ============================================
 * createSlug — Genera slug para URLs SEO-friendly
 * ============================================
 *
 * Convierte un título en una URL amigable:
 *   "¿Quién tiene la razón?" → "quien-tiene-la-razon"
 *
 * Pasos:
 *   1. Minúsculas
 *   2. Normalización Unicode (NFKD)
 *   3. Eliminación de diacríticos (tildes, ñ → n)
 *   4. Espacios y caracteres especiales → guiones
 *   5. Límite de 100 caracteres
 */
export function createSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

/**
 * ============================================
 * getCasePath — Genera URL semántica para un caso
 * ============================================
 *
 * Produce URLs SEO-friendly:
 *   /cases/username/titulo-del-caso
 *
 * Si no se puede generar la URL semántica (falta username
 * o título), cae a /cases/:id.
 */
export function getCasePath(caseData: {
  id: string;
  title?: string;
  sideA?: { username?: string };
}) {
  const username = caseData.sideA?.username?.trim();
  const title = caseData.title?.trim();

  if (username && title) {
    return `/cases/${encodeURIComponent(username)}/${encodeURIComponent(
      createSlug(title)
    )}`;
  }

  return `/cases/${caseData.id}`;
}

/**
 * ============================================
 * sleep — Pausa asíncrona
 * ============================================
 *
 * Útil para simular latencia en desarrollo o
 * implementar reintentos con backoff.
 *
 * Ejemplo:
 *   await sleep(2000); // Espera 2 segundos
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ============================================
 * safeJsonParse — JSON.parse sin excepciones
 * ============================================
 *
 * Parsea un string JSON y devuelve el fallback si el
 * string es inválido. Imprescindible para leer datos
 * no confiables (sessionStorage, localStorage).
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * ============================================
 * sanitizeImageUrl — Valida URLs de imágenes
 * ============================================
 *
 * Previene inyección de esquemas peligrosos
 * (javascript:, data:, vbscript:, ...) a través de
 * atributos src. Devuelve un placeholder si la URL
 * no es http/https absoluta o relativa segura.
 */
const DANGEROUS_PROTOCOLS = ['javascript', 'data', 'vbscript', 'blob', 'filesystem'];

export function sanitizeImageUrl(url: string, fallback = '/placeholder-image.png'): string {
  if (!url) return fallback;

  try {
    const parsed = new URL(url, window.location.origin);

    if (DANGEROUS_PROTOCOLS.includes(parsed.protocol.replace(':', ''))) {
      return fallback;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}

/**
 * ============================================
 * calculateVotePercentages — Porcentajes de votación
 * ============================================
 *
 * Calcula los porcentajes A/B/Ambos Mal garantizando
 * que sumen exactamente 100% (el último se deriva de
 * los otros dos) y determina el ganador.
 */
export function calculateVotePercentages(
  votesA: number,
  votesB: number,
  votesBothWrong: number,
) {
  const totalVotes = votesA + votesB + votesBothWrong;
  const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 0;
  const percentBoth = totalVotes > 0 ? 100 - percentA - percentB : 0;
  const winner = percentA > percentB ? 'A' : percentB > percentA ? 'B' : 'Tie';
  return { totalVotes, percentA, percentB, percentBoth, winner };
}
