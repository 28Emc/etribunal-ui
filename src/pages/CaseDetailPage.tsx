import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, AlertTriangle, Flag, Trash2, Pencil } from 'lucide-react';
import { CaseDetail } from '@components/ui/CaseDetail';
import { ReportModal } from '@components/ui/ReportModal';
import { DeleteCaseModal } from '@components/ui/DeleteCaseModal';
import { EditImagesModal } from '@components/ui/EditImagesModal';
import { EditCaseModal, type EditCasePayload } from '@components/ui/EditCaseModal';
import { useAuth } from '@context/AuthContext';
import { useVote } from '@hooks/useVote';
import { useReactions } from '@hooks/useReactions';
import { useComments } from '@hooks/useComments';
import { useSavedCases } from '@hooks/useSavedCases';
import { apiClient } from '@api/client';
import { mapDbCaseToCase, mapDbCommentToComment } from '@shared/utils/caseMapper';
import type { Case, CaseComment } from '@typings/index';
import { useToast } from '@components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';
import { CaseDetailSkeleton } from '@components/ui/Skeleton';

export function CaseDetailPage() {
  const { id, username, slug } = useParams<{ id?: string; username?: string; slug?: string }>();
  const navigate = useNavigate();
  const { currentUser, token } = useAuth();
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [newCommentsCount, setNewCommentsCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditImagesModal, setShowEditImagesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showEditCaseModal, setShowEditCaseModal] = useState(false);
  const commentsCountRef = useRef<number>(0);
  const commentsSkipRef = useRef<number>(0);

  const isModerator = currentUser?.role === 'MODERATOR';
  const isCurrentUserSideA = !!currentUser && !!caseData?.sideAUserId && currentUser.id === caseData.sideAUserId;
  const isCurrentUserSideB = !!currentUser && !!caseData?.sideBUserId && currentUser.id === caseData.sideBUserId;
  const canEditCase = isCurrentUserSideA || isCurrentUserSideB;
  const totalImages = (caseData?.sideA?.evidence?.length || 0) + (caseData?.sideB?.evidence?.length || 0);
  const isReported = caseData?.report_status === 'REPORTED';
  const isUnderReview = isReported && caseData?.moderation_status === 'FLAGGED';
  const isResolved = caseData?.report_status === 'RESOLVED';

  const { voteForCase } = useVote();
  const { toggleReaction } = useReactions();
  const commentsHook = useComments();
  const { addComment, deleteComment, fetchInitialComments, checkForNewComments, showNewComments, fetchOlderComments } = commentsHook;
  const { toggleSave } = useSavedCases();

  useEffect(() => {
    const caseIdentifier = id || (username && slug ? `${username}/${slug}` : undefined);
    if (!caseIdentifier) return;

    const fetchSingleCase = async () => {
      setIsLoading(true);
      try {
        const caseRes = await apiClient.get<any>(
          id ? `/cases/${id}` : `/cases/slug/${encodeURIComponent(username!)}/${encodeURIComponent(slug!)}`
        );
        
        await fetchInitialComments(caseRes.id);
        
        const mappedCase = mapDbCaseToCase(caseRes, currentUser?.id);
        
        setCaseData(mappedCase);
      } catch (error) {
        console.error('Error fetching case:', error);
        addToast('error', t('toasts.errorFetchingCase') || 'Error fetching case');
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSingleCase();
  }, [id, username, slug, currentUser?.id, fetchInitialComments]);

  useEffect(() => {
    if (!caseData?.id) return;

    const checkNewComments = async () => {
      const newCount = await checkForNewComments(caseData.id);
    };

    const interval = setInterval(checkNewComments, 15000);
    return () => clearInterval(interval);
  }, [caseData?.id, checkForNewComments]);

  const handleShowNewComments = () => {
    showNewComments();
  };


  const handleVote = async (caseId: string, side: 'A' | 'B' | 'BothWrong') => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const voteSide = side === 'BothWrong' ? 'BOTH_WRONG' : side;
      const res = await voteForCase(caseId, voteSide);
      if (res && caseData) {
        setCaseData(prev => prev ? {
          ...prev,
          votesA: res.votes_a,
          votesB: res.votes_b,
          votesBothWrong: res.votes_both_wrong
        } : prev);
        if (currentUser) {
          currentUser.votes = {
            ...currentUser.votes,
            [caseId]: voteSide
          };
        }
      }
    } catch (err: any) {
      addToast('error', err.message || t('toasts.voteError'));
    } finally {
      setIsVoting(false);
    }
  };

  const handleToggleSave = async (caseId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await toggleSave(caseId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReaction = async (caseId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY', targetType: 'CASE' | 'COMMENT', targetId: string) => {
    if (isReacting || !caseData) return;
    setIsReacting(true);
    try {
      const newSummary = await toggleReaction(targetType, targetId, emoji);
      if (newSummary) {
        const reactionsMap = { LIKE: 0, LOVE: 0, ANGRY: 0 };
        newSummary.reactions.forEach((r: any) => {
          if (r.emoji in reactionsMap) {
            reactionsMap[r.emoji as 'LIKE' | 'LOVE' | 'ANGRY'] = r.count;
          }
        });

        if (targetType === 'CASE') {
          setCaseData({
            ...caseData,
            reactions: reactionsMap,
            userReaction: caseData.userReaction === emoji ? null : emoji
          });
        } else if (targetType === 'COMMENT') {
          const updateCommentsRecursive = (comments: CaseComment[]): CaseComment[] => {
            return comments.map(c => {
              if (c.id === targetId) {
                return { 
                  ...c, 
                  reactions: reactionsMap, 
                  userReaction: c.userReaction === emoji ? null : emoji 
                };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: updateCommentsRecursive(c.replies) };
              }
              return c;
            });
          };

          setCaseData({
            ...caseData,
            comments: updateCommentsRecursive(caseData.comments)
          });
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsReacting(false);
    }
  };

const handleAddComment = async (caseId: string, text: string, parentId?: string) => {
    if (isCommenting || !caseData) return;
    setIsCommenting(true);
    try {
      await addComment(caseId, text, parentId);
      addToast('success', t('toasts.verdictSentSuccess'));
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || t('toasts.commentError'));
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (caseId: string, commentId: string) => {
    if (isDeletingComment || !caseData || !caseData.id) {
      return;
    }
    setIsDeletingComment(true);
    try {
      await deleteComment(commentId);
      addToast('success', t('toasts.verdictDeleted'));
    } catch (err: any) {
      console.error(err);
      addToast('error', t('toasts.errorDeletingVerdict'));
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleLikeComment = async (caseId: string, commentId: string) => {
    await handleReaction(caseId, 'LIKE', 'COMMENT', commentId);
  };

  const handleRespondSideB = async (story: string, images: string[], isAnonymous?: boolean) => {
    if (!caseData || !token) return;
    try {
      await apiClient.post(`/cases/respond`, {
        invite_token: caseData.inviteToken,
        side_b_content: story,
        evidence_urls: images,
        is_anonymous: isAnonymous ?? false,
      });
      const data = await apiClient.get<any>(`/cases/${caseData.id}`);
      setCaseData(mapDbCaseToCase(data, currentUser?.id));
      addToast('success', t('toasts.responseRegisteredSuccess'));
    } catch (error: any) {
      console.error('Error responding:', error);
      addToast('error', error.message || t('toasts.errorSendingResponse'));
    }
  };

  const handleRegenerateInviteLink = async (caseId: string) => {
    try {
      const result = await apiClient.post<any>(`/cases/${caseId}/invite-link`, {});
      return result.invite_url || `${window.location.origin}/cases/${result.invite_token}`;
    } catch (error) {
      console.error('Error regenerating invite:', error);
      return null;
    }
  };

  const handleReportCase = async (caseId: string, reason: string) => {
    try {
      await apiClient.post(`/cases/${caseId}/report`, { reason });
      const data = await apiClient.get<any>(`/cases/${caseId}`);
      setCaseData(mapDbCaseToCase(data, currentUser?.id));
      addToast('success', t('moderator.reportSubmitted'));
    } catch (err: any) {
      addToast('error', err.message || t('moderator.reportError'));
      throw err;
    }
  };

  const handleDeleteCase = async (caseId: string, reason: string) => {
    try {
      await apiClient.post(`/cases/${caseId}/delete`, { reason });
      addToast('success', t('moderator.deleteSuccess'));
      navigate('/', { replace: true });
    } catch (err: any) {
      addToast('error', err.message || t('moderator.deleteError'));
      throw err;
    }
  };

  const handleEditImages = async (caseId: string, keepImageIds: string[], newUrls: string[]) => {
    try {
      const updatedCase = await apiClient.patch<any>(`/cases/${caseId}/images`, { keepImageIds, newUrls });
      setCaseData(mapDbCaseToCase(updatedCase, currentUser?.id));
      addToast('success', t('moderator.imagesUpdated'));
    } catch (err: any) {
      addToast('error', err.message || t('moderator.imagesError'));
      throw err;
    }
  };

  const handleEditCase = async (caseId: string, dto: EditCasePayload) => {
    try {
      const updatedCase = await apiClient.patch<any>(`/cases/${caseId}`, dto);
      setCaseData(mapDbCaseToCase(updatedCase, currentUser?.id));
      addToast('success', t('cases.caseEdited'));
    } catch (err: any) {
      addToast('error', err.message || t('cases.caseEditedError'));
      throw err;
    }
  };

if (isLoading) {
    return (
      <PageLayout title={t('cases.title')}>
        <CaseDetailSkeleton />
      </PageLayout>
    );
  }

  if (!caseData) return null;

  return (
  <PageLayout 
    title={t('cases.caseDetails')}
    rightButton={canEditCase || (isModerator && totalImages > 0) ? {
      icon: MoreVertical,
      onClick: () => setShowReportMenu(true),
      tooltip: t('cases.moreOptions'),
    } : undefined}
    showRightButtonMenu={showReportMenu}
    onCloseRightButtonMenu={() => setShowReportMenu(false)}
    rightButtonMenu={showReportMenu ? (
      <div className="py-1">
        {canEditCase && (
          <button
            onClick={() => {
              setShowEditCaseModal(true);
              setShowReportMenu(false);
            }}
            className="w-full px-4 py-3 flex items-center gap-3 text-primary hover:bg-primary/10 transition-colors text-xs font-black uppercase tracking-widest text-left"
          >
            <Pencil className="w-4 h-4" />
            {isCurrentUserSideA ? t('cases.editCase') : t('cases.editYourDefense')}
          </button>
        )}
        {isModerator && totalImages > 0 && (
          isUnderReview ? (
            <button
              onClick={() => {
                setShowDeleteModal(true);
                setShowReportMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-black uppercase tracking-widest text-left"
            >
              <Trash2 className="w-4 h-4" />
              {t('moderator.deleteCase')}
            </button>
          ) : (
            <button
              onClick={() => {
                setShowReportModal(true);
                setShowReportMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-black uppercase tracking-widest text-left"
            >
              <Flag className="w-4 h-4" />
              {t('moderator.report')}
            </button>
          )
        )}
      </div>
    ) : undefined}
  >
    <SEO 
      title={caseData?.title || t('cases.caseDetails')}
      description={caseData?.sideA.story || undefined}
      image={caseData?.sideA.evidence?.[0]?.url || caseData?.sideB.evidence?.[0]?.url || undefined}
      url={`${import.meta.env.VITE_APP_URL || 'http://localhost:3000'}/cases/${caseData?.id || id}`}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: caseData?.title || '',
        description: caseData?.sideA.story || '',
        image: caseData?.sideA.evidence?.[0]?.url || undefined,
        author: { '@type': 'Person', name: caseData?.sideA.username || '' },
        datePublished: caseData?.createdAt || new Date().toISOString(),
      }}
    />

    {isReported && isCurrentUserSideA && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/10 border border-red-500/30 rounded-[32px] p-6 space-y-4 mx-2 md:mx-4 mt-4"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-black text-red-400 uppercase tracking-widest">
              {t('moderator.reportedBanner', { reason: caseData?.report_reason || '' })}
            </p>
            <p className="text-xs font-medium text-text-muted mt-1">{t('moderator.resolveByEditing')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowEditImagesModal(true)}
          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
        >
          {t('moderator.editImages')}
        </button>
      </motion.div>
    )}

    <div className="flex-1 px-3 md:px-4 py-6 space-y-10 pb-10 bg-card/50 rounded-[32px] border border-border-main/5">
      <CaseDetail
        caseData={caseData}
        currentUser={currentUser as any}
        onVote={handleVote}
        onClose={() => navigate(-1)}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onRespondSideB={handleRespondSideB}
        onRegenerateInviteLink={handleRegenerateInviteLink}
        onLikeComment={handleLikeComment}
        onReaction={handleReaction}
        onToggleSave={handleToggleSave}
        onUserClick={(username) => navigate(`/users/${username}`)}
        isVoting={isVoting}
        isSaving={isSaving}
        isCommenting={isCommenting}
        isReacting={isReacting}
        isDeleting={isDeletingComment}
        reactions={caseData.reactions || { LIKE: 0, LOVE: 0, ANGRY: 0 }}
        userReaction={caseData.userReaction}
        onOpenAuth={() => navigate('/login')}
        isModal={false}
        visibleComments={commentsHook.visibleComments}
        pendingComments={commentsHook.pendingComments}
        pendingCount={commentsHook.pendingCount}
        hasMore={commentsHook.hasMore}
        nextCursor={commentsHook.nextCursor}
        isFetching={commentsHook.isFetching}
        isPollingEnabled={commentsHook.isPollingEnabled}
        fetchInitialComments={commentsHook.fetchInitialComments}
        fetchOlderComments={commentsHook.fetchOlderComments}
        checkForNewComments={commentsHook.checkForNewComments}
        showNewComments={commentsHook.showNewComments}
        hideNewCommentsIndicator={commentsHook.hideNewCommentsIndicator}
      />
    </div>

    <AnimatePresence>
      {showReportModal && caseData && (
        <ReportModal
          caseTitle={caseData.title}
          onClose={() => setShowReportModal(false)}
          onSubmit={async (reason) => {
            await handleReportCase(caseData.id, reason);
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showDeleteModal && caseData && (
        <DeleteCaseModal
          caseTitle={caseData.title}
          onClose={() => setShowDeleteModal(false)}
          onSubmit={async (reason) => {
            await handleDeleteCase(caseData.id, reason);
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showEditImagesModal && caseData && (
        <EditImagesModal
          images={[
            ...caseData.sideA.evidence.map(e => ({ id: e.id, url: e.url })),
            ...caseData.sideB.evidence.map(e => ({ id: e.id, url: e.url })),
          ]}
          onClose={() => setShowEditImagesModal(false)}
          onSubmit={async (keepImageIds, newUrls) => {
            await handleEditImages(caseData.id, keepImageIds, newUrls);
          }}
        />
      )}
    </AnimatePresence>

    {showEditCaseModal && caseData && (
      <EditCaseModal
        caseData={caseData}
        currentUserId={currentUser?.id}
        onClose={() => setShowEditCaseModal(false)}
        onSubmit={async (dto) => {
          await handleEditCase(caseData.id, dto);
        }}
      />
    )}
  </PageLayout>
);
}
