import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@shared/components/SEO';
import { ResetPassword } from '@components/ui/ResetPasswordForm';
import { useAuth } from '@context/AuthContext';
import { useTranslation } from 'react-i18next';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <PageLayout title={t('auth.resetPassword')}>
      <SEO title={t('auth.resetPassword')} />
      <div className="flex-1 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <ResetPassword onPasswordReset={() => navigate('/login')} />
      </div>
    </PageLayout>
  );
}
