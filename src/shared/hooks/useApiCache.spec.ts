import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiCache, requestCache } from './useApiCache';

describe('useApiCache', () => {
  beforeEach(() => {
    requestCache.clear();
  });

  it('get debería retornar null para claves inexistentes', () => {
    expect(requestCache.get('test-key')).toBeNull();
    expect(requestCache.get('otro', 5000)).toBeNull();
  });

  it('set/get debería persistir y devolver el dato', () => {
    requestCache.set('key1', { data: 42 });
    expect(requestCache.get<{ data: number }>('key1')).toEqual({ data: 42 });
  });

  it('get con TTL debería expirar el dato tras el tiempo límite', () => {
    vi.useFakeTimers();
    requestCache.set('key2', 'hello');
    expect(requestCache.get<string>('key2', 5000)).toBe('hello');

    vi.advanceTimersByTime(5001);
    expect(requestCache.get<string>('key2', 5000)).toBeNull();
    vi.useRealTimers();
  });

  it('get sin TTL debería devolver datos aunque pasen ms', () => {
    vi.useFakeTimers();
    requestCache.set('key3', 'persistente');
    vi.advanceTimersByTime(100000);
    expect(requestCache.get<string>('key3')).toBe('persistente');
    vi.useRealTimers();
  });

  it('invalidatePattern debería purgar las claves que empiezan con el prefijo', () => {
    requestCache.set('notifications:0:20', { a: 1 });
    requestCache.set('notifications:20:20', { a: 2 });
    requestCache.set('other:1', { a: 3 });

    requestCache.invalidatePattern('notifications:');

    expect(requestCache.get('notifications:0:20')).toBeNull();
    expect(requestCache.get('notifications:20:20')).toBeNull();
    expect(requestCache.get('other:1')).toEqual({ a: 3 });
  });

  it('clear debería vaciar toda la cache', () => {
    requestCache.set('a', 1);
    requestCache.set('b', 2);
    requestCache.clear();
    expect(requestCache.get('a')).toBeNull();
    expect(requestCache.get('b')).toBeNull();
  });

  it('useApiCache hook debería exponer los mismos métodos de requestCache', () => {
    const { result } = renderHook(() => useApiCache());

    expect(typeof result.current.get).toBe('function');
    expect(typeof result.current.set).toBe('function');
    expect(typeof result.current.invalidatePattern).toBe('function');
    expect(typeof result.current.clear).toBe('function');

    result.current.set('k', 42);
    expect(result.current.get('k')).toBe(42);
  });
});