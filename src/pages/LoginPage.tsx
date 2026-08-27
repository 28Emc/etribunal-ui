import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@layout/PageLayout';
import { Login } from '@components/ui/LoginModal';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@context/AuthContext';
import { SEO } from '@shared/components/SEO';

interface LoginPageProps {
  isSignUp?: boolean;
}

export function LoginPage({ isSignUp = false }: LoginPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  // Redirigir si ya está autenticado
  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <PageLayout
      title={isSignUp ? t('auth.signUp') : t('auth.signIn')}
    >
      <SEO title={isSignUp ? t('auth.signUp') : t('auth.signIn')} />
      <div className="flex-1 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <Login
          isModal={false}
          initialIsSignUp={isSignUp}
          onLoginSuccess={() => navigate('/')}
        />
      </div>
    </PageLayout>
  );
}
