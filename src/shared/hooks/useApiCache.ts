/**
 * ============================================
 * shared/hooks/useApiCache.ts — Cache en memoria con TTL
 * ============================================
 *
 * ¿Qué es?
 *   Reemplaza al stub original (que devolvía null siempre) por una
 *   cache real en memoria clave→valor con expiración por TTL y
 *   invalidación por prefijo.
 *
 * Contrato (compatible con useNotifications):
 *   - set(key, data)        → registra el dato con timestamp actual
 *   - get(key, ttl?)        → devuelve el dato si fue seteado en los
 *                             últimos `ttl` ms; si no, lo purga y
 *                             devuelve null (sin ttl devuelve siempre).
 *   - invalidatePattern(p)  → borra todas las claves que empiezan con p
 *   - clear()               → vacía la cache
 *
 * Límite de tamaño:
 *   Evita el crecimiento ilimitado: al superar MAX_ENTRIES se expulsa
 *   la entrada más antigua (Map preserva orden de inserción).
 */

interface CacheEntry {
  data: unknown;
  storedAt: number;
}

const MAX_ENTRIES = 250;

const cache = new Map<string, CacheEntry>();

function evictIfNeeded() {
  if (cache.size < MAX_ENTRIES) return;
  const oldestKey = cache.keys().next().value;
  if (oldestKey !== undefined) cache.delete(oldestKey);
}

export const requestCache = {
  get<T>(key: string, ttl?: number): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (typeof ttl === 'number' && Date.now() - entry.storedAt > ttl) {
      cache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set(key: string, data: unknown): void {
    evictIfNeeded();
    cache.set(key, { data, storedAt: Date.now() });
  },

  invalidatePattern(pattern: string): void {
    for (const key of Array.from(cache.keys())) {
      if (key.startsWith(pattern)) cache.delete(key);
    }
  },

  clear(): void {
    cache.clear();
  },
};

export function useApiCache() {
  return requestCache;
}