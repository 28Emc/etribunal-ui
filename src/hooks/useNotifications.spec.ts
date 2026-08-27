import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { authStorage } from '@api/client';
import { requestCache } from '@shared/hooks/useApiCache';

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
  authStorage: {
    isAuthenticated: vi.fn(() => true),
    getAccessToken: vi.fn(() => 'token-xyz'),
  },
}));

vi.mock('@shared/hooks/useApiCache', () => ({
  requestCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
    invalidatePattern: vi.fn(),
  },
}));

function makeNotification(id: string, overrides = {}) {
  return {
    id,
    type: 'vote',
    payload: {},
    is_read: false,
    created_at: '2024-01-01T00:00:00Z',
    actor_id: null,
    actor_username: null,
    actor_avatar: null,
    ...overrides,
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    (requestCache.get as any).mockClear();
    (requestCache.set as any).mockClear();
    (requestCache.invalidatePattern as any).mockClear();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchNotifications debería obtener notificaciones', async () => {
    const { result } = renderHook(() => useNotifications());

    mockGet.mockResolvedValue({
      notifications: [makeNotification('n1'), makeNotification('n2')],
      total: 2,
      unread_count: 1,
    });

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.unreadCount).toBe(1);
    expect(mockGet).toHaveBeenCalledWith('/notifications?skip=0&take=20');
  });

  it('fetchNotifications debería soportar paginación', async () => {
    const { result } = renderHook(() => useNotifications());

    mockGet.mockResolvedValue({ notifications: [], total: 0, unread_count: 0 });

    await act(async () => {
      await result.current.fetchNotifications(10, 5);
    });

    expect(mockGet).toHaveBeenCalledWith('/notifications?skip=10&take=5');
  });

  it('markAsRead debería marcar notificación como leída', async () => {
    const { result } = renderHook(() => useNotifications());

    mockGet.mockResolvedValue({
      notifications: [makeNotification('n1'), makeNotification('n2')],
      total: 2,
      unread_count: 2,
    });

    await act(async () => {
      await result.current.fetchNotifications();
    });

    mockPatch.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.notifications[0].is_read).toBe(true);
    expect(result.current.unreadCount).toBe(1);
    expect(mockPatch).toHaveBeenCalledWith('/notifications/n1/read', {});
  });

  it('markAllAsRead debería marcar todas como leídas', async () => {
    const { result } = renderHook(() => useNotifications());

    mockGet.mockResolvedValue({
      notifications: [makeNotification('n1'), makeNotification('n2', { is_read: false })],
      total: 2,
      unread_count: 2,
    });

    await act(async () => {
      await result.current.fetchNotifications();
    });

    mockPatch.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.notifications.every(n => n.is_read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(mockPatch).toHaveBeenCalledWith('/notifications/read-all', {});
  });

  it('fetchUnreadCount debería obtener conteo de no leídas', async () => {
    const { result } = renderHook(() => useNotifications());

    mockGet.mockResolvedValue({ unread_count: 5 });

    await act(async () => {
      await result.current.fetchUnreadCount();
    });

    expect(result.current.unreadCount).toBe(5);
    expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('fetchNotifications no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('markAsRead no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('markAllAsRead no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('fetchUnreadCount no llama API si no autenticado', async () => {
    (authStorage.isAuthenticated as any).mockReturnValueOnce(false);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchUnreadCount();
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.unreadCount).toBe(0);
  });

  it('fetchNotifications usa caché cuando está disponible', async () => {
    (requestCache.get as any).mockReturnValueOnce({
      notifications: [makeNotification('n1'), makeNotification('n2')],
      total: 2,
      unread_count: 0,
    });
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.unreadCount).toBe(0);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetchUnreadCount usa caché cuando está disponible', async () => {
    (requestCache.get as any).mockReturnValueOnce(3);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchUnreadCount();
    });

    expect(result.current.unreadCount).toBe(3);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('markAsRead maneja error de API', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useNotifications());

    mockGet.mockResolvedValue({
      notifications: [makeNotification('n1')],
      total: 1,
      unread_count: 1,
    });

    await act(async () => {
      await result.current.fetchNotifications();
    });

    mockPatch.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.notifications[0].is_read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith('Error marking notification as read:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('fetchNotifications guarda en caché la respuesta', async () => {
    const { result } = renderHook(() => useNotifications());
    const response = {
      notifications: [makeNotification('n1')],
      total: 1,
      unread_count: 0,
    };

    mockGet.mockResolvedValue(response);

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(requestCache.set).toHaveBeenCalledWith(expect.stringContaining('notifications:'), response);
  });

  it('markAsRead invalida caché de notificaciones', async () => {
    const { result } = renderHook(() => useNotifications());

    mockPatch.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(requestCache.invalidatePattern).toHaveBeenCalledWith('notifications:');
  });
});
