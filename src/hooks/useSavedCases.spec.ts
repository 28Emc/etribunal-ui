import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedCases } from './useSavedCases';
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

describe('useSavedCases', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useSavedCases());

    expect(result.current.savedCases).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isSaved).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchSavedCases debería obtener casos guardados', async () => {
    const { result } = renderHook(() => useSavedCases());

    mockGet.mockResolvedValue({
      cases: [
        { case_id: '1', title: 'Caso 1', category: 'Justice', created_at: '2024-01-01', side_a_username: 'user1', side_a_avatar: null },
        { case_id: '2', title: 'Caso 2', category: 'Ethics', created_at: '2024-01-02', side_a_username: 'user2', side_a_avatar: null },
      ],
      total: 2,
    });

    await act(async () => {
      await result.current.fetchSavedCases(0, 20);
    });

    expect(result.current.savedCases).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(mockGet).toHaveBeenCalledWith('/saved-cases?skip=0&take=20');
  });

  it('fetchSavedCases debería usar paginación', async () => {
    const { result } = renderHook(() => useSavedCases());

    mockGet.mockResolvedValue({ cases: [], total: 0 });

    await act(async () => {
      await result.current.fetchSavedCases(10, 5);
    });

    expect(mockGet).toHaveBeenCalledWith('/saved-cases?skip=10&take=5');
  });

  it('toggleSave debería guardar/desguardar un caso', async () => {
    const { result } = renderHook(() => useSavedCases());

    mockPost.mockResolvedValue({ saved: true, caseResponse: { total_anchors: 3 } });

    let response: any;
    await act(async () => {
      response = await result.current.toggleSave('case-1');
    });

    expect(response!.saved).toBe(true);
    expect(response!.anchorsCount).toBe(3);
    expect(result.current.isSaved).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/saved-cases/case-1/save', {});
  });

  it('toggleSave debería alternar a no guardado', async () => {
    const { result } = renderHook(() => useSavedCases());

    mockPost.mockResolvedValue({ saved: false, caseResponse: null });

    await act(async () => {
      await result.current.toggleSave('case-1');
    });

    expect(result.current.isSaved).toBe(false);
  });

  it('checkSaved debería verificar estado de guardado', async () => {
    const { result } = renderHook(() => useSavedCases());

    mockGet.mockResolvedValue({ saved: true });

    await act(async () => {
      await result.current.checkSaved('case-1');
    });

    expect(result.current.isSaved).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('/saved-cases/case-1/saved');
  });

  it('checkSaved debería detectar no guardado', async () => {
    const { result } = renderHook(() => useSavedCases());

    mockGet.mockResolvedValue({ saved: false });

    await act(async () => {
      await result.current.checkSaved('case-2');
    });

    expect(result.current.isSaved).toBe(false);
  });

  it('fetchSavedCases no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useSavedCases());

    await act(async () => {
      await result.current.fetchSavedCases(0, 20);
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.savedCases).toEqual([]);
  });

  it('toggleSave no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useSavedCases());

    let res: any;
    await act(async () => {
      res = await result.current.toggleSave('case-1');
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(res).toBeUndefined();
    expect(result.current.isSaved).toBe(false);
  });

  it('checkSaved no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useSavedCases());

    await act(async () => {
      await result.current.checkSaved('case-1');
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isSaved).toBe(false);
  });

  it('toggleSave maneja error de API', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSavedCases());

    mockPost.mockRejectedValue(new Error('Network error'));

    let res: any;
    await act(async () => {
      res = await result.current.toggleSave('case-1');
    });

    expect(res).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error toggling save:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
