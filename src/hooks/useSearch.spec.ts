import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';

const mockGet = vi.fn();
vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
  authStorage: {
    isAuthenticated: vi.fn(() => true),
    getUserId: vi.fn(() => 'user-123'),
  },
}));

vi.mock('./useDebounce', () => ({
  useDebounce: (value: string, _ms: number) => value,
}));

function makeUser(overrides = {}) {
  return { id: 'u1', username: 'juan', avatar_url: null, bio: 'Bio', ...overrides };
}

describe('useSearch', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual({ users: [], cases: [], hasMore: false });
    expect(result.current.isSearching).toBe(false);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchType).toBe('ALL');
  });

  it('setQuery debería actualizar la query', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');
  });

  it('debería buscar cuando query >= minChars', async () => {
    const { result } = renderHook(() => useSearch());

    mockGet.mockResolvedValue({ following: [] });

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    mockGet.mockResolvedValue({ users: [makeUser()], cases: [], hasMore: false });

    act(() => {
      result.current.setQuery('ju');
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(result.current.results.users).toHaveLength(1);
    expect(mockGet).toHaveBeenLastCalledWith(
      expect.stringContaining('/search/advanced?q=ju')
    );
  });

  it('clearResults debería resetear todo y traer following', async () => {
    const { result } = renderHook(() => useSearch());

    mockGet.mockResolvedValue({ following: [] });

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual({ users: [], cases: [], hasMore: false });
    expect(result.current.error).toBeNull();
  });

  it('search() manual debería ejecutar búsqueda', async () => {
    const { result } = renderHook(() => useSearch({ minChars: 2 }));

    mockGet.mockResolvedValue({ following: [] });

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    mockGet.mockResolvedValue({ users: [], cases: [{ id: 'c1', title: 'Caso' }], hasMore: false });

    act(() => {
      result.current.setQuery('consulta');
    });

    act(() => {
      result.current.search();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(result.current.results.cases).toHaveLength(1);
  });

  it('debería manejar error en búsqueda', async () => {
    const { result } = renderHook(() => useSearch());

    mockGet.mockResolvedValue({ following: [] });

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    mockGet.mockRejectedValueOnce(new Error('Server error'));

    act(() => {
      result.current.setQuery('error');
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(result.current.error).toBe('Server error');
  });

  it('setSearchType debería cambiar el tipo de búsqueda', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setSearchType('USERS');
    });

    expect(result.current.searchType).toBe('USERS');
  });

  it('fetchFollowing debería manejar error de API', async () => {
    const { result } = renderHook(() => useSearch());
    mockGet.mockRejectedValueOnce(new Error('Following error'));
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(result.current.isSearching).toBe(false);
  });

  it('query vacío debería mostrar following cuando autenticado', async () => {
    mockGet.mockResolvedValue({ following: [{ id: 'u1', username: 'testuser', avatar_url: null, bio: null }] });
    const { result } = renderHook(() => useSearch());
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    act(() => { result.current.setQuery('a'); });
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    act(() => { result.current.setQuery(''); });
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(mockGet).toHaveBeenCalledWith('/users/me/following?take=10');
  });

  it('debería limpiar AbortController al desmontar', () => {
    const { unmount } = renderHook(() => useSearch());
    unmount();
  });

  it('search() no debería ejecutarse si query < minChars', () => {
    const { result } = renderHook(() => useSearch({ minChars: 3 }));
    mockGet.mockClear();
    act(() => { result.current.setQuery('ab'); });
    act(() => { result.current.search(); });
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining('/search/advanced'));
  });

  it('debería buscar con type CASES', async () => {
    mockGet.mockResolvedValue({ following: [] });
    const { result } = renderHook(() => useSearch());
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    act(() => { result.current.setSearchType('CASES'); });
    mockGet.mockResolvedValue({ users: [], cases: [{ id: 'c1', title: 'Caso test', category: 'legal', status: 'PUBLIC' }], hasMore: false });
    act(() => { result.current.setQuery('test'); });
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    expect(mockGet).toHaveBeenLastCalledWith(expect.stringContaining('type=CASES'));
  });
});
