import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReactions } from './useReactions';

const mockIsAuthenticated = vi.hoisted(() => vi.fn(() => true));
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
  authStorage: {
    isAuthenticated: mockIsAuthenticated,
  },
}));

describe('useReactions', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useReactions());

    expect(result.current.reactions).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchReactions debería obtener reacciones de un caso', async () => {
    const { result } = renderHook(() => useReactions());

    mockGet.mockResolvedValue({
      reactions: [{ emoji: 'LIKE', count: 5 }, { emoji: 'LOVE', count: 3 }],
      user_reaction: 'LIKE',
    });

    await act(async () => {
      await result.current.fetchReactions('CASE', 'case-1');
    });

    expect(result.current.reactions).toBeDefined();
    expect(result.current.reactions!.user_reaction).toBe('LIKE');
    expect(mockGet).toHaveBeenCalledWith('/reactions?target_type=CASE&target_id=case-1');
  });

  it('fetchReactions debería obtener reacciones de un comentario', async () => {
    const { result } = renderHook(() => useReactions());

    mockGet.mockResolvedValue({
      reactions: [{ emoji: 'ANGRY', count: 1 }],
      user_reaction: null,
    });

    await act(async () => {
      await result.current.fetchReactions('COMMENT', 'comment-1');
    });

    expect(mockGet).toHaveBeenCalledWith('/reactions?target_type=COMMENT&target_id=comment-1');
  });

  it('toggleReaction debería enviar reacción y actualizar estado', async () => {
    const { result } = renderHook(() => useReactions());

    mockPost.mockResolvedValue({
      reactions: [{ emoji: 'LIKE', count: 6 }, { emoji: 'LOVE', count: 3 }],
      user_reaction: 'LIKE',
    });

    let response: any;
    await act(async () => {
      response = await result.current.toggleReaction('CASE', 'case-1', 'LIKE');
    });

    expect(response!.user_reaction).toBe('LIKE');
    expect(result.current.reactions!.user_reaction).toBe('LIKE');
    expect(mockPost).toHaveBeenCalledWith('/reactions', {
      target_type: 'CASE',
      target_id: 'case-1',
      emoji: 'LIKE',
    });
  });

  it('toggleReaction debería manejar toggle-off (deseleccionar)', async () => {
    const { result } = renderHook(() => useReactions());

    mockPost.mockResolvedValue({
      reactions: [{ emoji: 'LIKE', count: 5 }, { emoji: 'LOVE', count: 3 }],
      user_reaction: null,
    });

    await act(async () => {
      await result.current.toggleReaction('CASE', 'case-1', 'LIKE');
    });

    expect(result.current.reactions!.user_reaction).toBeNull();
  });

  it('debería manejar error en fetchReactions', async () => {
    const { result } = renderHook(() => useReactions());

    mockGet.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.fetchReactions('CASE', 'case-1');
    });

    expect(result.current.reactions).toBeNull();
  });

  it('fetchReactions no debería llamar API cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useReactions());

    await act(async () => {
      await result.current.fetchReactions('CASE', 'case-1');
    });

    expect(result.current.reactions).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('toggleReaction no debería llamar API cuando no está autenticado', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useReactions());

    let response: any;
    await act(async () => {
      response = await result.current.toggleReaction('CASE', 'case-1', 'LIKE');
    });

    expect(response).toBeUndefined();
    expect(result.current.reactions).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('toggleReaction debería manejar error en la API', async () => {
    const { result } = renderHook(() => useReactions());

    mockPost.mockRejectedValue(new Error('API Error'));

    let response: any;
    await act(async () => {
      response = await result.current.toggleReaction('CASE', 'case-1', 'LIKE');
    });

    expect(response).toBeUndefined();
    expect(result.current.reactions).toBeNull();
    expect(mockPost).toHaveBeenCalled();
  });
});
