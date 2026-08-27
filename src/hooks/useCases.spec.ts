import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCases } from './useCases';

const mockGet = vi.fn();
vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
  authStorage: {
    getUserId: vi.fn(() => 'user-123'),
    isAuthenticated: vi.fn(() => true),
  },
}));

const mockMapDbCaseToCase = vi.fn((c: any) => ({
  ...c,
  id: c.id,
  title: c.title || '',
  category: c.category || 'Justice',
}));

vi.mock('@shared/utils/caseMapper', () => ({
  mapDbCaseToCase: (...args: any[]) => mockMapDbCaseToCase(...args),
}));

function makeCase(id: string, title: string) {
  return { id, title, category: 'Justice', side_a_username: 'user1', side_b_username: null };
}

describe('useCases', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockMapDbCaseToCase.mockClear();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useCases());

    expect(result.current.cases).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('fetchCases debería obtener casos y resetear el feed', async () => {
    const { result } = renderHook(() => useCases());

    const rawData = [makeCase('1', 'Caso 1'), makeCase('2', 'Caso 2')];
    mockGet.mockResolvedValue(rawData);

    await act(async () => {
      await result.current.fetchCases(0, 'for_you', 'All', '');
    });

    expect(result.current.cases).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/cases?')
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('skip=0')
    );
  });

  it('fetchCases debería pasar feedType, category y query', async () => {
    const { result } = renderHook(() => useCases());

    mockGet.mockResolvedValue([]);

    await act(async () => {
      await result.current.fetchCases(0, 'trending', 'Justice', 'democracia');
    });

    const url: string = mockGet.mock.calls[0][0];
    expect(url).toContain('feedType=trending');
    expect(url).toContain('category=Justice');
    expect(url).toContain('q=democracia');
  });

  it('loadMore debería agregar casos al feed existente', async () => {
    const { result } = renderHook(() => useCases());

    // Need exactly 20 items for hasMore to be true
    const batch1 = Array.from({ length: 20 }, (_, i) => makeCase(String(i), `Caso ${i}`));
    mockGet.mockResolvedValueOnce(batch1);

    await act(async () => {
      await result.current.fetchCases(0, 'for_you');
    });

    expect(result.current.cases).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);

    mockGet.mockResolvedValue([makeCase('20', 'Caso 20')]);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.cases).toHaveLength(21);
    expect(result.current.cases[20].id).toBe('20');
  });

  it('loadMore no debería ejecutarse si isLoading o !hasMore', async () => {
    const { result } = renderHook(() => useCases());

    mockGet.mockResolvedValue([makeCase('1', 'Caso 1')]);

    await act(async () => {
      await result.current.fetchCases(0, 'for_you');
    });

    mockGet.mockResolvedValue([]);

    // First loadMore
    await act(async () => {
      await result.current.loadMore();
    });

    // hasMore should now be false because we got 0 items
    expect(result.current.hasMore).toBe(false);
    expect(result.current.cases).toHaveLength(1);

    // Second loadMore should NOT call API
    mockGet.mockClear();
    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('refreshCases debería reobtener casos con los mismos parámetros', async () => {
    const { result } = renderHook(() => useCases());

    mockGet.mockResolvedValueOnce([makeCase('1', 'Viejo')]);
    await act(async () => {
      await result.current.fetchCases(0, 'trending', 'Ethics', 'test');
    });

    // Simulate new data
    mockGet.mockResolvedValue([makeCase('1', 'Nuevo')]);
    await act(async () => {
      await result.current.refreshCases();
    });

    const url: string = mockGet.mock.calls[mockGet.mock.calls.length - 1][0];
    expect(url).toContain('feedType=trending');
    expect(url).toContain('category=Ethics');
    expect(url).toContain('q=test');
    expect(url).toContain('skip=0');
  });

  it('updateCase debería actualizar un caso parcialmente', () => {
    const { result } = renderHook(() => useCases());

    // Seed cases directly
    act(() => {
      result.current.setCases([
        { id: '1', title: 'Original', category: 'Justice' } as any,
      ]);
    });

    act(() => {
      result.current.updateCase('1', { title: 'Modificado' } as any);
    });

    expect(result.current.cases[0].title).toBe('Modificado');
  });

  it('updateCase debería aceptar función updater', () => {
    const { result } = renderHook(() => useCases());

    act(() => {
      result.current.setCases([
        { id: '1', title: 'Original', category: 'Justice', votesA: 5 } as any,
      ]);
    });

    act(() => {
      result.current.updateCase('1', (prev: any) => ({
        ...prev,
        votesA: prev.votesA + 1,
      }));
    });

    expect(result.current.cases[0].votesA).toBe(6);
  });

  it('debería manejar error en fetchCases', async () => {
    const { result } = renderHook(() => useCases());

    mockGet.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.fetchCases(0, 'for_you');
    });

    expect(result.current.cases).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
