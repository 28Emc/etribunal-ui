import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollow } from './useFollow';

const mockIsAuthenticated = vi.hoisted(() => vi.fn(() => true));
const mockPost = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: { post: (...args: any[]) => mockPost(...args) },
  authStorage: {
    isAuthenticated: mockIsAuthenticated,
  },
}));

describe('useFollow', () => {
  beforeEach(() => { mockPost.mockReset(); mockIsAuthenticated.mockReturnValue(true); });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useFollow());
    expect(result.current.following).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('debería seguir a un usuario exitosamente', async () => {
    const { result } = renderHook(() => useFollow());

    mockPost.mockResolvedValue({ following: true });

    let success = false;
    await act(async () => {
      success = await result.current.toggleFollow('juanperez');
    });

    expect(success).toBe(true);
    expect(result.current.following).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/users/juanperez/follow', {});
  });

  it('debería dejar de seguir a un usuario', async () => {
    const { result } = renderHook(() => useFollow());

    mockPost.mockResolvedValueOnce({ following: true });
    await act(async () => {
      await result.current.toggleFollow('juanperez');
    });

    mockPost.mockResolvedValueOnce({ following: false });
    await act(async () => {
      const r = await result.current.toggleFollow('juanperez');
      expect(r).toBe(false);
    });

    expect(result.current.following).toBe(false);
  });

  it('debería manejar error en la petición', async () => {
    const { result } = renderHook(() => useFollow());

    mockPost.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.toggleFollow('juanperez');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.following).toBe(false);
  });

  it('debería retornar following actual cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useFollow());

    let res: boolean;
    await act(async () => {
      res = await result.current.toggleFollow('juanperez');
    });

    expect(res!).toBe(false);
    expect(result.current.following).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('debería usar mensaje por defecto cuando error no tiene message', async () => {
    const { result } = renderHook(() => useFollow());

    mockPost.mockRejectedValue({});

    await act(async () => {
      await result.current.toggleFollow('juanperez');
    });

    expect(result.current.error).toBe('Error toggling follow');
  });
});
