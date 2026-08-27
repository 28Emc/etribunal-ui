import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@shared/components/SEO';
import { ForgotPassword } from '@components/ui/ForgotPasswordForm';
import { useAuth } from '@context/AuthContext';
import { useTranslation } from 'react-i18next';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <PageLayout title={t('auth.forgotPassword')}>
      <SEO title={t('auth.forgotPassword')} />
      <div className="flex-1 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <ForgotPassword onBackToLogin={() => navigate('/login')} />
      </div>
    </PageLayout>
  );
}
