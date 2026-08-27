import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVote } from './useVote';

const mockIsAuthenticated = vi.hoisted(() => vi.fn(() => true));
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

let mockCurrentUser: any = { id: 'user-1', votes: {} };

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  authStorage: {
    isAuthenticated: mockIsAuthenticated,
  },
}));

vi.mock('@context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: mockCurrentUser,
  })),
}));

describe('useVote', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
    localStorage.clear();
    mockCurrentUser = { id: 'user-1', votes: {} };
    mockIsAuthenticated.mockReturnValue(true);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useVote());

    expect(result.current.vote).toBeNull();
    expect(result.current.votesA).toBe(0);
    expect(result.current.votesB).toBe(0);
    expect(result.current.votesBothWrong).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('voteForCase debería votar y actualizar el estado', async () => {
    const { result } = renderHook(() => useVote());

    mockPost.mockResolvedValue({
      vote_type: 'A',
      votes_a: 10,
      votes_b: 5,
      votes_both_wrong: 1,
    });

    await act(async () => {
      await result.current.voteForCase('case-1', 'A');
    });

    expect(result.current.vote).toBe('A');
    expect(result.current.votesA).toBe(10);
    expect(result.current.votesB).toBe(5);
    expect(mockPost).toHaveBeenCalledWith('/cases/case-1/votes', { vote_type: 'A' });
  });

  it('voteForCase debería persistir voto en localStorage', async () => {
    const { result } = renderHook(() => useVote());

    mockPost.mockResolvedValue({
      vote_type: 'B',
      votes_a: 3,
      votes_b: 7,
      votes_both_wrong: 0,
    });

    await act(async () => {
      await result.current.voteForCase('case-2', 'B');
    });

    const savedUser = JSON.parse(localStorage.getItem('etribunal_user')!);
    expect(savedUser.votes['case-2']).toBe('B');
  });

  it('removeVote debería eliminar el voto', async () => {
    const { result } = renderHook(() => useVote());

    mockDelete.mockResolvedValue({
      vote_type: null,
      votes_a: 0,
      votes_b: 0,
      votes_both_wrong: 0,
    });

    await act(async () => {
      await result.current.removeVote('case-1');
    });

    expect(result.current.vote).toBeNull();
    expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/votes');
  });

  it('removeVote debería eliminar voto de localStorage', async () => {
    mockCurrentUser = {
      id: 'user-1',
      votes: { 'case-1': 'A', 'case-2': 'B' },
    };

    const { result } = renderHook(() => useVote());

    mockDelete.mockResolvedValue({
      vote_type: null,
      votes_a: 0,
      votes_b: 0,
      votes_both_wrong: 0,
    });

    await act(async () => {
      await result.current.removeVote('case-1');
    });

    const savedUser = JSON.parse(localStorage.getItem('etribunal_user')!);
    expect(savedUser.votes['case-1']).toBeUndefined();
    expect(savedUser.votes['case-2']).toBe('B');
  });

  it('fetchVote debería obtener el voto actual', async () => {
    const { result } = renderHook(() => useVote());

    mockGet.mockResolvedValue({
      vote_type: 'BOTH_WRONG',
      votes_a: 15,
      votes_b: 20,
      votes_both_wrong: 5,
    });

    await act(async () => {
      await result.current.fetchVote('case-1');
    });

    expect(result.current.vote).toBe('BOTH_WRONG');
    expect(result.current.votesBothWrong).toBe(5);
    expect(mockGet).toHaveBeenCalledWith('/cases/case-1/votes');
  });

  it('debería mostrar loading durante voteForCase', async () => {
    const { result } = renderHook(() => useVote());

    let resolvePromise: (v: any) => void;
    mockPost.mockImplementation(() => new Promise(r => { resolvePromise = r; }));

    let votePromise: Promise<any>;
    act(() => {
      votePromise = result.current.voteForCase('case-1', 'A');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolvePromise!({
        vote_type: 'A', votes_a: 1, votes_b: 1, votes_both_wrong: 0,
      });
      await votePromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('fetchVote no debería llamar API cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useVote());

    await act(async () => {
      await result.current.fetchVote('case-1');
    });

    expect(result.current.vote).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('voteForCase no debería llamar API cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useVote());

    let response: any;
    await act(async () => {
      response = await result.current.voteForCase('case-1', 'A');
    });

    expect(response).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('removeVote no debería llamar API cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useVote());

    let response: any;
    await act(async () => {
      response = await result.current.removeVote('case-1');
    });

    expect(response).toBeUndefined();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('fetchVote debería manejar error en la API', async () => {
    const { result } = renderHook(() => useVote());

    mockGet.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.fetchVote('case-1');
    });

    expect(result.current.vote).toBeNull();
    expect(result.current.votesA).toBe(0);
    expect(result.current.votesB).toBe(0);
    expect(result.current.votesBothWrong).toBe(0);
    expect(mockGet).toHaveBeenCalled();
  });
});
