import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchUsers } from './useSearchUsers';

const mockGet = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: { get: (...args: any[]) => mockGet(...args) },
  authStorage: {
    isAuthenticated: vi.fn(() => true),
    getUserId: vi.fn(() => 'user_1'),
    getAccessToken: vi.fn(() => 'token'),
  },
}));

describe('useSearchUsers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería devolver estado inicial vacío', () => {
    const { result } = renderHook(() => useSearchUsers());
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('debería no buscar si query es menor a 2 caracteres', () => {
    const { result } = renderHook(() => useSearchUsers());
    act(() => { result.current.search('a'); });
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('debería debounce la búsqueda por 300ms', () => {
    const { result } = renderHook(() => useSearchUsers());

    act(() => { result.current.search('juan'); });
    expect(mockGet).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(299); });
    expect(mockGet).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(mockGet).toHaveBeenCalledWith('/users/search?q=juan&take=8');
  });

  it('debería devolver resultados después de buscar', async () => {
    const { result } = renderHook(() => useSearchUsers());

    const users = [
      { id: 'u1', username: 'juanperez', avatar_url: 'https://example.com/avatar.jpg', bio: 'Hola' },
    ];
    mockGet.mockResolvedValue(users);

    act(() => { result.current.search('juan'); });
    act(() => { vi.advanceTimersByTime(300); });
    await vi.waitFor(() => {
      expect(result.current.results).toEqual(users);
    });
  });

  it('debería cancelar búsqueda previa si se llama search de nuevo', () => {
    const { result } = renderHook(() => useSearchUsers());

    mockGet.mockResolvedValue([{ id: 'u1', username: 'juan', avatar_url: null, bio: null }]);

    act(() => { result.current.search('primera'); });
    act(() => { vi.advanceTimersByTime(100); });

    act(() => { result.current.search('segunda'); });
    act(() => { vi.advanceTimersByTime(300); });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/users/search?q=segunda&take=8');
  });

  it('debería manejar error en la búsqueda', async () => {
    const { result } = renderHook(() => useSearchUsers());

    mockGet.mockRejectedValue(new Error('Network error'));

    act(() => { result.current.search('test'); });
    act(() => { vi.advanceTimersByTime(300); });
    await vi.waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('debería limpiar resultados al llamar clearResults', () => {
    const { result } = renderHook(() => useSearchUsers());

    result.current.clearResults();
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
