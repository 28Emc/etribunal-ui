import { useState, useCallback } from 'react';
import { apiClient, authStorage } from '@api/client';
import { requestCache } from '@shared/hooks/useApiCache';

interface Notification {
  id: string;
  type: string;
  payload: any;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_avatar: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (skip?: number, take?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async (skip: number = 0, take: number = 20) => {
    if (!authStorage.isAuthenticated()) return;

    const token = authStorage.getAccessToken();
    const cacheKey = `notifications:${skip}:${take}:${token}`;
    
    const cached = requestCache.get<NotificationsResponse>(cacheKey, 30000);
    if (cached) {
      setNotifications(cached.notifications);
      setTotal(cached.total);
      setUnreadCount(cached.unread_count);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient.get(
        `/notifications?skip=${skip}&take=${take}`
      ) as any;
      requestCache.set(cacheKey, data);
      setNotifications(data.notifications);
      setTotal(data.total);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!authStorage.isAuthenticated()) return;

    try {
      await apiClient.patch(`/notifications/${notificationId}/read`, {}) as any;
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      requestCache.invalidatePattern('notifications:');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!authStorage.isAuthenticated()) return;

    try {
      await apiClient.patch('/notifications/read-all', {}) as any;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      requestCache.invalidatePattern('notifications:');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!authStorage.isAuthenticated()) return;

    const token = authStorage.getAccessToken();
    const cacheKey = `unread_count:${token}`;
    const cached = requestCache.get<number>(cacheKey, 60000);
    if (cached !== null) {
      setUnreadCount(cached);
      return;
    }

    try {
      const data = await apiClient.get('/notifications/unread-count') as any;
      requestCache.set(cacheKey, data.unread_count);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  return {
    notifications,
    total,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  };
}
