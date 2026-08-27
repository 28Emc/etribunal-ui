import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '@layout/MainLayout';
import { LoadingState } from '@components/ui/LoadingState';
import { useAuth } from '@context/AuthContext';
import { consumeInviteDeepLink } from '@pages/InvitePage';
import { FeedPage } from '@pages/FeedPage';

const CaseDetailPage = lazy(() => import('@pages/CaseDetailPage').then(m => ({ default: m.CaseDetailPage })));
const CreateCasePage = lazy(() => import('@pages/CreateCasePage').then(m => ({ default: m.CreateCasePage })));
const InvitePage = lazy(() => import('@pages/InvitePage').then(m => ({ default: m.InvitePage })));
const JoinCasePage = lazy(() => import('@pages/JoinCasePage').then(m => ({ default: m.JoinCasePage })));
const LoginPage = lazy(() => import('@pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const ProfilePage = lazy(() => import('@pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('@pages/SearchPage').then(m => ({ default: m.SearchPage })));
const TermsAndConditionsPage = lazy(() => import('@pages/legal/TermsAndConditionsPage').then(m => ({ default: m.TermsAndConditionsPage })));
const PrivacyPolicyPage = lazy(() => import('@pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const CommunityGuidelinesPage = lazy(() => import('@pages/legal/CommunityGuidelinesPage').then(m => ({ default: m.CommunityGuidelinesPage })));
const AboutPage = lazy(() => import('@pages/legal/AboutPage').then(m => ({ default: m.AboutPage })));

const L = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingState />}>{children}</Suspense>
);

const DEEP_LINK_KEY = 'etribunal_deep_link';

function parseDeepLink(pathname: string): string | null {
  const caseMatch = pathname.match(/^\/cases?\//);
  if (caseMatch) return pathname;

  const userMatch = pathname.match(/^\/users?\//);
  if (userMatch) return pathname;

  return null;
}

export default function AppRoutes() {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const deepLink = parseDeepLink(location.pathname);
    if (deepLink && !currentUser) {
      sessionStorage.setItem(DEEP_LINK_KEY, deepLink);
    }
  }, [location.pathname, currentUser]);

  useEffect(() => {
    if (!currentUser || isLoading) return;

    const inviteToken = consumeInviteDeepLink();
    if (inviteToken) {
      navigate(`/case/${inviteToken}`, { replace: true });
      return;
    }

    const savedDeepLink = sessionStorage.getItem(DEEP_LINK_KEY);
    if (savedDeepLink) {
      sessionStorage.removeItem(DEEP_LINK_KEY);
      navigate(savedDeepLink);
    }
  }, [currentUser, isLoading, navigate]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <Routes>
      <Route path="/login" element={<MainLayout><L><LoginPage /></L></MainLayout>} />
      <Route path="/register" element={<MainLayout><L><LoginPage isSignUp /></L></MainLayout>} />
      <Route path="/forgot-password" element={<MainLayout><L><ForgotPasswordPage /></L></MainLayout>} />
      <Route path="/reset-password" element={<MainLayout><L><ResetPasswordPage /></L></MainLayout>} />
      <Route path="/verify-email" element={<MainLayout><L><VerifyEmailPage /></L></MainLayout>} />
      <Route path="/case/:token" element={<MainLayout><L><InvitePage /></L></MainLayout>} />
      <Route path="/cases/:username/:slug" element={<MainLayout><L><CaseDetailPage /></L></MainLayout>} />
      <Route path="/cases/:id" element={<MainLayout><L><CaseDetailPage /></L></MainLayout>} />
      <Route path="/respond/:id" element={<MainLayout><L><JoinCasePage /></L></MainLayout>} />
      <Route path="/create" element={<MainLayout><L><CreateCasePage /></L></MainLayout>} />
      <Route path="/" element={<MainLayout activeTab="for_you"><FeedPage initialTab="for_you" /></MainLayout>} />
      <Route path="/cases" element={<Navigate to="/" replace />} />
      <Route path="/cases/following" element={<MainLayout activeTab="following"><FeedPage initialTab="following" /></MainLayout>} />
      <Route path="/cases/trending" element={<MainLayout activeTab="trending"><FeedPage initialTab="trending" /></MainLayout>} />
      <Route path="/top-judges" element={<MainLayout activeTab="top-judges"><FeedPage initialTab="top-judges" /></MainLayout>} />
      <Route path="/search" element={<MainLayout><L><SearchPage /></L></MainLayout>} />
      <Route path="/settings" element={<MainLayout><L><SettingsPage /></L></MainLayout>} />
      <Route path="/users/:username" element={<MainLayout><L><ProfilePage /></L></MainLayout>} />
      <Route path="/legal/terms" element={<MainLayout><L><TermsAndConditionsPage /></L></MainLayout>} />
      <Route path="/legal/privacy" element={<MainLayout><L><PrivacyPolicyPage /></L></MainLayout>} />
      <Route path="/legal/guidelines" element={<MainLayout><L><CommunityGuidelinesPage /></L></MainLayout>} />
      <Route path="/legal/about" element={<MainLayout><L><AboutPage /></L></MainLayout>} />
      <Route path="/*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
