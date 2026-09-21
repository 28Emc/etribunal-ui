import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';

const auth = vi.hoisted(() => ({ currentUser: null as unknown, isLoading: false }));
let frameReady = false;
vi.mock('@context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@utils/inviteDeepLink', () => ({ consumeInviteDeepLink: vi.fn(() => null) }));
vi.mock('@components/ui/LoadingScreen', () => ({ LoadingScreen: () => <div>brand-loading</div> }));
vi.mock('@components/ui/LoadingState', () => ({ LoadingState: () => <div>route-loading</div> }));
vi.mock('@layout/MainLayout', () => ({ MainLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@layout/AdminLayout', () => ({ AdminLayout: () => <section>admin-layout</section> }));
vi.mock('@pages/FeedPage', () => ({ FeedPage: ({ initialTab }: { initialTab: string }) => <div>feed:{initialTab}</div> }));
vi.mock('@pages/CaseDetailPage', () => ({ CaseDetailPage: () => <div>CaseDetailPage</div> }));
vi.mock('@pages/CreateCasePage', () => ({ CreateCasePage: () => <div>CreateCasePage</div> }));
vi.mock('@pages/InvitePage', () => ({ InvitePage: () => <div>InvitePage</div> }));
vi.mock('@pages/JoinCasePage', () => ({ JoinCasePage: () => <div>JoinCasePage</div> }));
vi.mock('@pages/LoginPage', () => ({ LoginPage: ({ isSignUp }: { isSignUp?: boolean }) => <div>LoginPage{isSignUp ? ':signup' : ''}</div> }));
vi.mock('@pages/ForgotPasswordPage', () => ({ ForgotPasswordPage: () => <div>ForgotPasswordPage</div> }));
vi.mock('@pages/ResetPasswordPage', () => ({ ResetPasswordPage: () => <div>ResetPasswordPage</div> }));
vi.mock('@pages/VerifyEmailPage', () => ({ VerifyEmailPage: () => <div>VerifyEmailPage</div> }));
vi.mock('@pages/ProfilePage', () => ({ ProfilePage: () => <div>ProfilePage</div> }));
vi.mock('@pages/SettingsPage', () => ({ SettingsPage: () => <div>SettingsPage</div> }));
vi.mock('@pages/SearchPage', () => ({ SearchPage: () => <div>SearchPage</div> }));
vi.mock('@pages/legal/TermsAndConditionsPage', () => ({ TermsAndConditionsPage: () => <div>TermsAndConditionsPage</div> }));
vi.mock('@pages/legal/PrivacyPolicyPage', () => ({ PrivacyPolicyPage: () => <div>PrivacyPolicyPage</div> }));
vi.mock('@pages/legal/CommunityGuidelinesPage', () => ({ CommunityGuidelinesPage: () => <div>CommunityGuidelinesPage</div> }));
vi.mock('@pages/legal/AboutPage', () => ({ AboutPage: () => <div>AboutPage</div> }));
vi.mock('@pages/automation/AutomationPage', () => ({ AutomationPage: () => <div>AutomationPage</div> }));

describe('AppRoutes', () => {
  beforeEach(() => {
    auth.currentUser = null;
    auth.isLoading = false;
    sessionStorage.clear();
    frameReady = false;
    vi.spyOn(performance, 'now').mockImplementation(() => frameReady ? 500 : 0);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameReady = true; cb(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('shows the brand loader while authentication is loading', () => {
    auth.isLoading = true;
    render(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>);
    expect(screen.getByText('brand-loading')).toBeInTheDocument();
  });

  it('renders public routes and redirects unknown paths to the feed', async () => {
    render(<MemoryRouter initialEntries={['/legal/about']}><AppRoutes /></MemoryRouter>);
    await act(async () => {});
    expect(screen.getByText('AboutPage')).toBeInTheDocument();
    frameReady = false;
    render(<MemoryRouter initialEntries={['/not-a-route']}><AppRoutes /></MemoryRouter>);
    await act(async () => {});
    expect(screen.getByText('feed:for_you')).toBeInTheDocument();
  });

  it('stores an unauthenticated deep link for later login', async () => {
    render(<MemoryRouter initialEntries={['/cases/c1']}><AppRoutes /></MemoryRouter>);
    await act(async () => {});
    expect(sessionStorage.getItem('etribunal_deep_link')).toBe('/cases/c1');
  });
});
