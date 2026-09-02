import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { PageLayout } from '@layout/PageLayout';
import { JoinCase } from '@components/ui/JoinCase';
import type { Case } from '@typings/index';
import { apiClient } from '@api/client';
import { mapDbCaseToCase } from '@shared/utils/caseMapper';
import { useToast } from '@components/ui/Toast';

export function JoinCasePage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCase = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await apiClient.get<any>(`/cases/${id}`);
      if (data) {
        setCaseData(mapDbCaseToCase(data));
        setInviteToken(data.invite_token || data.id);
      }
    } catch (err) {
      console.error('Error fetching case:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  const handleSubmitResponse = async (story: string, images: string[], isAnonymous: boolean) => {
    if (!inviteToken || !story.trim()) return;
    
    try {
      await apiClient.post(`/cases/respond`, {
        invite_token: inviteToken,
        side_b_content: story,
        evidence_urls: images,
        is_anonymous: isAnonymous
      });
      addToast('success', t('toasts.responseSubmitted'));
      navigate('/');
    } catch (err: any) {
      console.error('Error submitting response:', err);
      addToast('error', err.message || t('errors.genericError'));
      throw err;
    }
  };

  if (!caseData && !isLoading) {
    return (
      <PageLayout title={t('cases.caseNotFound')}>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted">{t('cases.caseNotFound')}</p>
        </div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title={t('cases.title')}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('joinCase.joinCase')}>
      <div className="flex-1 max-w-2xl mx-auto w-full px-3 md:px-4 py-4 md:py-6 space-y-8 md:space-y-10 pb-10 bg-card/50 rounded-[32px] border border-border-main/5">
        <JoinCase
          caseData={caseData!}
          onSubmit={handleSubmitResponse}
        />
      </div>
    </PageLayout>
  );
}
