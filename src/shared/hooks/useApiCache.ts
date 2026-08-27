export function useApiCache() {
  return { get: <T>(_key: string, _ttl?: number) => null as T | null, set: (_key: string, _data: unknown) => {}, invalidatePattern: (_pattern: string) => {} };
}
export const requestCache = { get: <T>(_key: string, _ttl?: number) => null as T | null, set: (_key: string, _data: unknown) => {}, invalidatePattern: (_pattern: string) => {} };
