import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from './UserCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
}));

vi.mock('@services/anonymity', () => ({
  getDisplayName: vi.fn((username) => username),
  getAnonymousAvatar: vi.fn(() => 'https://placeholder.com/avatar.png'),
}));

describe('UserCard', () => {
  const mockOnFollow = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => { vi.clearAllMocks(); });

  it('debería renderizar información del usuario', () => {
    render(
      <UserCard
        id="user-1"
        username="testuser"
        avatarUrl="https://example.com/avatar.png"
        isAnonymous={false}
        followersCount={100}
        isFollowing={false}
        onFollow={mockOnFollow}
      />
    );
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('debería mostrar crown cuando showCrown es true', () => {
    render(
      <UserCard
        id="user-1"
        username="testuser"
        avatarUrl={null}
        isAnonymous={false}
        followersCount={100}
        isFollowing={false}
        onFollow={mockOnFollow}
        showCrown={true}
      />
    );
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('debería llamar onFollow al hacer click en el botón', async () => {
    render(
      <UserCard
        id="user-1"
        username="testuser"
        avatarUrl={null}
        isAnonymous={false}
        followersCount={100}
        isFollowing={false}
        onFollow={mockOnFollow}
      />
    );
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    expect(mockOnFollow).toHaveBeenCalledWith('user-1', 'testuser');
  });

  it('debería mostrar estado following', () => {
    render(
      <UserCard
        id="user-1"
        username="testuser"
        avatarUrl={null}
        isAnonymous={false}
        followersCount={100}
        isFollowing={true}
        onFollow={mockOnFollow}
      />
    );
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('debería llamar onClick al hacer click en la card', () => {
    const onClick = vi.fn();
    const { container } = render(
      <UserCard
        id="user-1"
        username="testuser"
        avatarUrl={null}
        isAnonymous={false}
        followersCount={100}
        isFollowing={false}
        onFollow={mockOnFollow}
        onClick={onClick}
      />
    );
    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledWith('testuser');
  });
});
