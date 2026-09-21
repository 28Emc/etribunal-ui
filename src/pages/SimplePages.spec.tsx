import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AboutPage } from './legal/AboutPage';
import { TermsAndConditionsPage } from './legal/TermsAndConditionsPage';
import { PrivacyPolicyPage } from './legal/PrivacyPolicyPage';
import { CommunityGuidelinesPage } from './legal/CommunityGuidelinesPage';
import { InvitePage } from './InvitePage';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  get: vi.fn(),
  setInviteDeepLink: vi.fn(),
  auth: { currentUser: null as unknown, isLoading: false },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ token: 'invite-token' }),
}));

vi.mock('@context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@api/client', () => ({
  apiClient: { get: mocks.get },
}));

vi.mock('@utils/inviteDeepLink', () => ({
  setInviteDeepLink: mocks.setInviteDeepLink,
}));

vi.mock('@layout/PageLayout', () => ({
  PageLayout: ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <main data-testid="page-layout" data-title={title}>{children}</main>
  ),
}));

vi.mock('@components/ui/SEO', () => ({
  Seo: ({ title }: { title: string }) => <div data-testid="seo" data-title={title} />,
}));

vi.mock('@shared/components/SEO', () => ({
  Seo: ({ title }: { title: string }) => <div data-testid="seo" data-title={title} />,
}));

vi.mock('@components/ui/LoginModal', () => ({
  Login: ({
    initialIsSignUp,
    onLoginSuccess,
  }: { initialIsSignUp?: boolean; onLoginSuccess?: () => void }) => (
    <div data-testid="login-form" data-sign-up={String(initialIsSignUp)}>
      <button onClick={onLoginSuccess}>login success</button>
    </div>
  ),
}));

describe('legal pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [AboutPage, 'legal.aboutVeridixo', 'legal.whatWeOffer'],
    [TermsAndConditionsPage, 'legal.termsAndConditions', 'legal.termsSection6'],
    [PrivacyPolicyPage, 'legal.privacyPolicy', 'legal.privacySection6'],
    [CommunityGuidelinesPage, 'legal.communityGuidelines', 'legal.guidelinesContent.rule4.title'],
  ])('renders %s content inside the shared layout', (Page, heading, lastSection) => {
    render(<Page />);

    expect(screen.getByTestId('page-layout')).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText(lastSection)).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toBeInTheDocument();
  });
});

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = null;
    mocks.auth.isLoading = false;
    sessionStorage.clear();
  });

  it('stores the invite and redirects unauthenticated users to login', async () => {
    render(<InvitePage />);

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/login', { replace: true }));
    expect(mocks.setInviteDeepLink).toHaveBeenCalledWith('invite-token');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('resolves an invite for an authenticated user and navigates to the response page', async () => {
    mocks.auth.currentUser = { id: 'user-1' };
    mocks.get.mockResolvedValue({ id: 'case-42' });

    render(<InvitePage />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/cases/invite/invite-token'));
    expect(mocks.navigate).toHaveBeenCalledWith('/respond/case-42', { replace: true });
  });

  it('shows an API error and lets the user return to the feed', async () => {
    mocks.auth.currentUser = { id: 'user-1' };
    mocks.get.mockRejectedValue(new Error('Invite expired'));

    render(<InvitePage />);

    expect(await screen.findByText('Invite expired')).toBeInTheDocument();
    fireEvent.click(screen.getByText('cases.backToFeed'));
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('waits while authentication is being initialized', () => {
    mocks.auth.isLoading = true;

    render(<InvitePage />);

    expect(screen.queryByText('cases.backToFeed')).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = null;
  });

  it('renders sign-in mode and navigates after login succeeds', () => {
    render(<LoginPage />);

    expect(screen.getByTestId('login-form')).toHaveAttribute('data-sign-up', 'false');
    fireEvent.click(screen.getByText('login success'));
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });

  it('renders sign-up mode when requested', () => {
    render(<LoginPage isSignUp />);

    expect(screen.getByTestId('login-form')).toHaveAttribute('data-sign-up', 'true');
    expect(screen.getByTestId('page-layout')).toHaveAttribute('data-title', 'auth.signUp');
  });

  it('redirects an already authenticated user', async () => {
    mocks.auth.currentUser = { id: 'user-1' };

    render(<LoginPage />);

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }));
  });
});
