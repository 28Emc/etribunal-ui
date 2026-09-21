import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('returns dark by default and follows data-theme changes', async () => {
    document.documentElement.removeAttribute('data-theme');
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('dark');

    act(() => document.documentElement.setAttribute('data-theme', 'light'));
    await act(async () => {});
    expect(result.current).toBe('light');

    act(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await act(async () => {});
    expect(result.current).toBe('dark');
  });

  it('disconnects its observer on unmount', () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const { unmount } = renderHook(() => useTheme());
    unmount();
    expect(disconnect).toHaveBeenCalled();
    disconnect.mockRestore();
  });
});
