import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiCache, requestCache } from './useApiCache';

describe('useApiCache', () => {
  it('get debería retornar null siempre (stub)', () => {
    expect(requestCache.get('test-key')).toBeNull();
    expect(requestCache.get('otro')).toBeNull();
  });

  it('set no debería persistir datos (stub)', () => {
    requestCache.set('key1', { data: 42 });
    expect(requestCache.get<{ data: number }>('key1')).toBeNull();
  });

  it('get con TTL debería retornar null (stub)', () => {
    requestCache.set('key2', 'hello');
    expect(requestCache.get<string>('key2', 5000)).toBeNull();
  });

  it('invalidatePattern no debería hacer nada (stub)', () => {
    requestCache.invalidatePattern('notifications:');
    expect(requestCache.get('anything')).toBeNull();
  });

  it('useApiCache hook debería exponer los mismos métodos', () => {
    const { result } = renderHook(() => useApiCache());

    expect(typeof result.current.get).toBe('function');
    expect(typeof result.current.set).toBe('function');
    expect(typeof result.current.invalidatePattern).toBe('function');

    expect(result.current.get('x')).toBeNull();
    result.current.set('k', 42);
    result.current.invalidatePattern('p');
    expect(result.current.get('k')).toBeNull();
  });
});
