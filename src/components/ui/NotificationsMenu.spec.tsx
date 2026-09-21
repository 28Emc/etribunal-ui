import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsMenu } from './NotificationsMenu';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('motion/react', () => ({ motion: { div: 'div' }, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@utils/helpers', () => ({ cn: (...v: string[]) => v.join(' '), formatRelativeCaseDate: () => 'now' }));

const base = { isOpen: true, onClose: vi.fn(), isLoading: false, onMarkAsRead: vi.fn(),
  onMarkAllAsRead: vi.fn(), onSelectCase: vi.fn(), onSelectProfile: vi.fn() };

describe('NotificationsMenu', () => {
  it('renders loading and empty states', () => {
    const { rerender } = render(<NotificationsMenu {...base} notifications={[]} isLoading />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    rerender(<NotificationsMenu {...base} notifications={[]} />);
    expect(screen.getByText('notifications.noNotifications')).toBeInTheDocument();
  });
  it('marks notifications and routes case/follower actions', () => {
    render(<NotificationsMenu {...base} notifications={[
      { id: 'n1', type: 'NEW_COMMENT', payload: { case_id: 'c1', case_title: 'Case' }, actor_username: 'alice', is_read: false, created_at: '' },
      { id: 'n2', type: 'NEW_FOLLOWER', payload: {}, actor_username: 'bob', is_read: true, created_at: '' },
    ]} />);
    fireEvent.click(screen.getByText(/notifications.newComment/));
    expect(base.onMarkAsRead).toHaveBeenCalledWith('n1');
    expect(base.onSelectCase).toHaveBeenCalledWith('c1');
    fireEvent.click(screen.getByText(/notifications.newFollower/));
    expect(base.onSelectProfile).toHaveBeenCalledWith('bob');
    fireEvent.click(screen.getByText('notifications.markAllRead'));
    expect(base.onMarkAllAsRead).toHaveBeenCalledOnce();
  });
});
