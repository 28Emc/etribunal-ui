import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@api/client';
import { useTranslation } from 'react-i18next';

const INVITE_TOKEN_KEY = 'etribunal_invite_token';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { currentUser, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;

    if (!currentUser) {
      sessionStorage.setItem(INVITE_TOKEN_KEY, token);
      navigate('/login', { replace: true });
      return;
    }

    const resolve = async () => {
      try {
        const caseData = await apiClient.get<any>(`/cases/invite/${token}`);
        navigate(`/respond/${caseData.id}`, { replace: true });
      } catch (err: any) {
        setError(err.message || t('cases.invalidInviteLink'));
      }
    };

    resolve();
  }, [authLoading, currentUser, token, navigate, t]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-black uppercase text-secondary">{error}</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm"
        >
          {t('cases.backToFeed')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export function consumeInviteDeepLink(): string | null {
  const token = sessionStorage.getItem(INVITE_TOKEN_KEY);
  if (token) sessionStorage.removeItem(INVITE_TOKEN_KEY);
  return token;
}
