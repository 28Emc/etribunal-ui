import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debería devolver el valor inicial si no hay nada en localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('debería leer el valor existente de localStorage', () => {
    localStorage.setItem('test_key', JSON.stringify('stored_value'));
    const { result } = renderHook(() => useLocalStorage('test_key', 'default'));
    expect(result.current[0]).toBe('stored_value');
  });

  it('debería devolver el valor inicial si hay error al parsear', () => {
    localStorage.setItem('test_key', 'invalid-json');
    const { result } = renderHook(() => useLocalStorage('test_key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('debería persistir el valor al setearlo', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'default'));
    act(() => { result.current[1]('new_value'); });
    expect(result.current[0]).toBe('new_value');
    expect(JSON.parse(localStorage.getItem('test_key')!)).toBe('new_value');
  });

  it('debería soportar función updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => { result.current[1]((prev) => prev + 1); });
    expect(result.current[0]).toBe(1);
    act(() => { result.current[1]((prev) => prev + 1); });
    expect(result.current[0]).toBe(2);
  });

  it('debería manejar objetos', () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ name: string; age: number }>('user', { name: '', age: 0 })
    );
    act(() => { result.current[1]({ name: 'Juan', age: 30 }); });
    expect(result.current[0]).toEqual({ name: 'Juan', age: 30 });
    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored).toEqual({ name: 'Juan', age: 30 });
  });

  it('debería persistir en múltiples claves independientes', () => {
    const { result: r1 } = renderHook(() => useLocalStorage('key_a', 'a'));
    const { result: r2 } = renderHook(() => useLocalStorage('key_b', 'b'));

    act(() => { r1.current[1]('updated_a'); });
    expect(r1.current[0]).toBe('updated_a');
    expect(r2.current[0]).toBe('b');
  });
});
