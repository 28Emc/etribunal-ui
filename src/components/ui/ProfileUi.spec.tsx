import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoadingScreen } from './LoadingScreen';
import { SectionTitle } from './SectionTitle';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats } from './ProfileStats';
import { ReportModal } from './ReportModal';
import type { User } from '@typings/index';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));
vi.mock('motion/react', () => ({
  motion: { div: 'div', img: 'img' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@hooks/useTheme', () => ({ useTheme: () => 'dark' }));

const user: User = {
  id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', avatar: '/ada.png',
  casesCreated: [], votes: {}, casesCount: 1234, followersCount: 20, followingCount: 7,
  is_following: true, role: 'USER',
};

describe('profile and shared UI components', () => {
  it('renders themed loading screen and section title', () => {
    render(<><LoadingScreen /><SectionTitle>Recent cases</SectionTitle></>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'common.loading');
    expect(screen.getByAltText('eTribunal')).toHaveAttribute('src', '/icons/eTribunal-isotipo-bn.png');
    expect(screen.getByText('Recent cases')).toBeInTheDocument();
  });

  it('renders profile identity and invokes avatar/follow actions', () => {
    const onFollow = vi.fn();
    const onAvatar = vi.fn();
    render(<ProfileHeader user={user} isOwnProfile={false} isFollowing={false}
      isFollowingLoading={false} confirmFollow={false} onFollowToggle={onFollow} onEditAvatar={onAvatar} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'profile.followJudge' }));
    expect(onFollow).toHaveBeenCalledOnce();
  });

  it('shows own profile avatar action and follower statistics actions', () => {
    const onAvatar = vi.fn(), onFollowers = vi.fn(), onFollowing = vi.fn();
    render(<><ProfileHeader user={user} isOwnProfile isFollowing isFollowingLoading={false}
      confirmFollow={true} onFollowToggle={vi.fn()} onEditAvatar={onAvatar} />
      <ProfileStats user={user} onFollowersClick={onFollowers} onFollowingClick={onFollowing} /></>);
    fireEvent.click(screen.getByRole('button', { name: 'profile.changeAvatar' }));
    fireEvent.click(screen.getByText('profile.followers'));
    fireEvent.click(screen.getByText('profile.following'));
    expect(onAvatar).toHaveBeenCalledOnce();
    expect(onFollowers).toHaveBeenCalledOnce();
    expect(onFollowing).toHaveBeenCalledOnce();
    expect(screen.getByText('1.2K')).toBeInTheDocument();
  });

  it('validates, submits and closes a report', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<ReportModal caseTitle="A case" onClose={onClose} onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: 'moderator.reportSubmit' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  spam  ' } });
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('spam');
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('keeps the modal open when report submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('failed'));
    const onClose = vi.fn();
    render(<ReportModal caseTitle="A case" onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'reason' } });
    fireEvent.click(screen.getByRole('button', { name: 'moderator.reportSubmit' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
