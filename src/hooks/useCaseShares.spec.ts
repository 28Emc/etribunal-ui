import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCaseShares } from './useCaseShares';
import { authStorage } from '@api/client';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
  authStorage: {
    isAuthenticated: vi.fn(() => true),
  },
}));

function makeSharedCase(id: string) {
  return {
    case_id: id,
    title: `Caso ${id}`,
    category: 'Justice',
    created_at: '2024-01-01T00:00:00Z',
    shared_at: '2024-01-02T00:00:00Z',
    side_a_username: 'user_a',
    side_a_avatar: null,
  };
}

describe('useCaseShares', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useCaseShares());

    expect(result.current.sharedCases).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isShared).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchSharedCases debería obtener casos compartidos', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockResolvedValue({
      cases: [makeSharedCase('1'), makeSharedCase('2')],
      total: 2,
    });

    await act(async () => {
      await result.current.fetchSharedCases();
    });

    expect(result.current.sharedCases).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(mockGet).toHaveBeenCalledWith('/saved-cases/shared?skip=0&take=20');
  });

  it('fetchSharedCases debería soportar paginación', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockResolvedValue({ cases: [], total: 0 });

    await act(async () => {
      await result.current.fetchSharedCases(5, 10);
    });

    expect(mockGet).toHaveBeenCalledWith('/saved-cases/shared?skip=5&take=10');
  });

  it('toggleShare debería compartir un caso', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockPost.mockResolvedValue({ shared: true, caseResponse: makeSharedCase('c1') });

    let shared: any;
    await act(async () => {
      shared = await result.current.toggleShare('c1');
    });

    expect(shared).toBe(true);
    expect(result.current.isShared).toBe(true);
    expect(result.current.sharedCases).toHaveLength(1);
    expect(mockPost).toHaveBeenCalledWith('/saved-cases/c1/share', {});
  });

  it('toggleShare debería descompartir un caso', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockPost.mockResolvedValue({ shared: false });

    await act(async () => {
      await result.current.toggleShare('c1');
    });

    expect(result.current.isShared).toBe(false);
  });

  it('checkShared debería verificar estado', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockResolvedValue({ shared: true });

    await act(async () => {
      await result.current.checkShared('c1');
    });

    expect(result.current.isShared).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('/saved-cases/c1/shared');
  });

  it('getShareCount debería obtener conteo de compartidos', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockResolvedValue({ shares: 7 });

    let count: number = 0;
    await act(async () => {
      count = await result.current.getShareCount('c1');
    });

    expect(count).toBe(7);
    expect(mockGet).toHaveBeenCalledWith('/saved-cases/c1/shares');
  });

  it('getShareCount debería retornar 0 si error', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockRejectedValue(new Error('Error'));

    let count: number = 999;
    await act(async () => {
      count = await result.current.getShareCount('c1');
    });

    expect(count).toBe(0);
  });

  it('fetchSharedCases no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useCaseShares());

    await act(async () => {
      await result.current.fetchSharedCases();
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sharedCases).toEqual([]);
  });

  it('toggleShare no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useCaseShares());

    let res: any;
    await act(async () => {
      res = await result.current.toggleShare('c1');
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(res).toBeUndefined();
    expect(result.current.isShared).toBe(false);
  });

  it('checkShared no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useCaseShares());

    await act(async () => {
      await result.current.checkShared('c1');
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isShared).toBe(false);
  });

  it('toggleShare usa caseResponse cuando viene en la respuesta', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockPost.mockResolvedValue({ shared: true, caseResponse: makeSharedCase('c2') });

    await act(async () => {
      await result.current.toggleShare('c2');
    });

    expect(result.current.isShared).toBe(true);
    expect(result.current.sharedCases).toHaveLength(1);
    expect(result.current.sharedCases[0].case_id).toBe('c2');
    expect(mockPost).toHaveBeenCalledWith('/saved-cases/c2/share', {});
  });

  it('checkShared maneja respuesta con is_shared', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockResolvedValue({ is_shared: true });

    await act(async () => {
      await result.current.checkShared('c1');
    });

    expect(result.current.isShared).toBeFalsy();
  });

  it('getShareCount retorna 0 si shares no está en respuesta', async () => {
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockResolvedValue({});

    let count: number = 999;
    await act(async () => {
      count = await result.current.getShareCount('c1');
    });

    expect(count).toBe(0);
  });

  it('fetchSharedCases maneja error de API', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useCaseShares());

    mockGet.mockRejectedValue(new Error('API error'));

    await act(async () => {
      await result.current.fetchSharedCases();
    });

    expect(result.current.isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching shared cases:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
