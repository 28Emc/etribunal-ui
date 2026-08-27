import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCase } from './useCase';

const mockIsAuthenticated = vi.hoisted(() => vi.fn(() => true));
const mockGet = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
  authStorage: {
    isAuthenticated: mockIsAuthenticated,
  },
}));

describe('useCase', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useCase());

    expect(result.current.caseData).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchCase debería obtener un caso por id', async () => {
    const { result } = renderHook(() => useCase());

    const mockCase = {
      id: 'case-1',
      title: 'Mi Caso',
      category: 'Justice',
      status: 'PUBLIC',
      sideA: { username: 'juan' },
      sideB: { username: 'maria' },
    };

    mockGet.mockResolvedValue(mockCase);

    let response: any;
    await act(async () => {
      response = await result.current.fetchCase('case-1');
    });

    expect(response).toEqual(mockCase);
    expect(result.current.caseData).toEqual(mockCase);
    expect(result.current.loading).toBe(false);
    expect(mockGet).toHaveBeenCalledWith('/cases/case-1');
  });

  it('fetchCase debería manejar error', async () => {
    const { result } = renderHook(() => useCase());

    mockGet.mockRejectedValue(new Error('Not found'));

    await act(async () => {
      const response = await result.current.fetchCase('invalid-id');
      expect(response).toBeNull();
    });

    expect(result.current.error).toBe('Not found');
    expect(result.current.caseData).toBeNull();
  });

  it('fetchCase debería mostrar loading durante la petición', async () => {
    const { result } = renderHook(() => useCase());

    let resolvePromise: (v: any) => void;
    mockGet.mockImplementation(() => new Promise(r => { resolvePromise = r; }));

    act(() => {
      result.current.fetchCase('case-1');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise!({ id: 'case-1', title: 'Test' });
    });

    expect(result.current.loading).toBe(false);
  });

  it('fetchCase debería retornar null cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useCase());

    let response: any;
    await act(async () => {
      response = await result.current.fetchCase('case-1');
    });

    expect(response).toBeNull();
    expect(result.current.caseData).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetchCase debería usar mensaje por defecto cuando error no tiene message', async () => {
    const { result } = renderHook(() => useCase());

    mockGet.mockRejectedValue({});

    await act(async () => {
      const response = await result.current.fetchCase('case-1');
      expect(response).toBeNull();
    });

    expect(result.current.error).toBe('Error fetching case');
  });
});
