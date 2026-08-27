import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('debería devolver el valor inicial inmediatamente', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debería mantener el valor inicial hasta que pase el delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });
    expect(result.current).toBe('hello');

    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('hello');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('world');
  });

  it('debería actualizar con delay 0 inmediatamente', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 0 } }
    );

    rerender({ value: 'b', delay: 0 });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current).toBe('b');
  });

  it('debería cancelar el timer anterior si cambia el valor antes del delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    rerender({ value: 'b', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'c', delay: 300 });

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('a');

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('c');
  });

  it('debería usar delay por defecto de 300ms', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'x' } }
    );

    rerender({ value: 'y' });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('x');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('y');
  });
});
