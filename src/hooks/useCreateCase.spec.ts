import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateCase } from './useCreateCase';

const mockPost = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: {
    post: (...args: any[]) => mockPost(...args),
  },
  authStorage: {
    isAuthenticated: vi.fn(() => true),
  },
}));

describe('useCreateCase', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useCreateCase());

    expect(result.current.creating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('createCase debería enviar payload correcto (type classic)', async () => {
    const { result } = renderHook(() => useCreateCase());

    mockPost.mockResolvedValue({ id: 'case-1', title: 'Mi caso' });

    let created: any;
    await act(async () => {
      created = await result.current.createCase({
        title: 'Mi caso',
        category: 'Justice',
        type: 'classic',
        sideAStory: 'Historia del lado A',
      });
    });

    expect(created!.id).toBe('case-1');
    expect(mockPost).toHaveBeenCalledWith('/cases', {
      title: 'Mi caso',
      category: 'Justice',
      type: 'classic',
      side_a: { story: 'Historia del lado A' },
    });
  });

  it('createCase debería incluir side_b_username si type=vote', async () => {
    const { result } = renderHook(() => useCreateCase());

    mockPost.mockResolvedValue({ id: 'case-2' });

    await act(async () => {
      await result.current.createCase({
        title: 'Caso voto',
        category: 'Ethics',
        type: 'vote',
        sideAStory: 'Historia A',
        sideBUsername: 'usuario_b',
      });
    });

    const payload = mockPost.mock.calls[0][1];
    expect(payload.type).toBe('vote');
    expect(payload.side_b_username).toBe('usuario_b');
  });

  it('createCase no debería incluir side_b_username si type=classic', async () => {
    const { result } = renderHook(() => useCreateCase());

    mockPost.mockResolvedValue({ id: 'case-3' });

    await act(async () => {
      await result.current.createCase({
        title: 'Caso classic',
        category: 'Justice',
        type: 'classic',
        sideAStory: 'Historia A',
        sideBUsername: 'usuario_b',
      });
    });

    const payload = mockPost.mock.calls[0][1];
    expect(payload.side_b_username).toBeUndefined();
  });

  it('createCase debería manejar error', async () => {
    const { result } = renderHook(() => useCreateCase());

    mockPost.mockRejectedValue(new Error('Error del servidor'));

    let created: any;
    await act(async () => {
      created = await result.current.createCase({
        title: 'Test',
        category: 'Justice',
        type: 'classic',
        sideAStory: 'Historia',
      });
    });

    expect(created).toBeNull();
    expect(result.current.error).toBe('Error del servidor');
  });

  it('createCase debería retornar null si no autenticado', async () => {
    const mockIsAuth = vi.mocked(vi.fn()).mockReturnValue(false);
    vi.mocked(await import('@api/client')).authStorage.isAuthenticated = mockIsAuth;

    const { result } = renderHook(() => useCreateCase());

    let created: any;
    await act(async () => {
      created = await result.current.createCase({
        title: 'Test',
        category: 'Justice',
        type: 'classic',
        sideAStory: 'Historia',
      });
    });

    expect(created).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
