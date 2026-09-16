import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CaseList } from '@components/ui/CaseList';
import { CategoryFilter } from '@layout/CategoryFilter';
import { TopJudgesList } from '@layout/TopJudgesList';
import { FeedSkeleton, EmptyState } from '@components/ui';
import { Tooltip } from '@components/ui/Tooltip';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/ui/Toast';
import type { Case, FeedTab } from '@typings/index';
import { apiClient } from '@api/client';
import { ShareModal } from '@components/ui/ShareModal';
import type { ShareType } from '@hooks/useShare';
import { getCasePath } from '@utils/helpers';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { SEO } from '@components/ui/SEO';
import { useAppDispatch } from '@redux/hooks';
import {
  FEED_PAGE_SIZE,
  incrementCaseShareCount,
  useGetFeedQuery,
  useVoteCaseMutation,
  useSaveCaseMutation,
  useReactToCaseMutation,
  type FeedArgs,
} from '@redux/services/casesApi';
import { useAddCommentMutation } from '@redux/services/commentsApi';

interface FeedPageProps {
  initialTab?: 'for_you' | 'following' | 'trending' | 'top-judges';
}

type FeedTabExtended = 'for_you' | 'following' | 'trending' | 'top-judges';

export function FeedPage({ initialTab = 'for_you' }: FeedPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentUser, setCurrentUser } = useAuth();

  const [addComment] = useAddCommentMutation();
  const { addToast } = useToast();

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning') => addToast(type, msg);

  const [activeTab, setActiveTab] = useState<FeedTabExtended>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [skip, setSkip] = useState(0);

  const [topJudgesCases, setTopJudgesCases] = useState<any[]>([]);
  const [isLoadingTopJudges, setIsLoadingTopJudges] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ type: ShareType; id: string; title?: string; username?: string }>({ type: 'case', id: '' });
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const FEED_SCROLL_KEY = 'etribunal_feed_scroll';

  const isTopJudges = activeTab === 'top-judges';

  // ============================================================
  // Feed — RTK Query (fuente de verdad única)
  // ============================================================
  const feedArgs: FeedArgs = {
    tab: (isTopJudges ? 'for_you' : activeTab) as FeedTab,
    category: selectedCategory,
    q: '',
    skip,
  };
  const { data, isLoading, isFetching, refetch } = useGetFeedQuery(feedArgs, { skip: isTopJudges });
  const cases = data?.cases ?? [];
  const hasMore = data?.hasMore ?? false;

  const [voteCase, { isLoading: isVotePending }] = useVoteCaseMutation();
  const [saveCase, { isLoading: isSavePending }] = useSaveCaseMutation();
  const [reactToCase] = useReactToCaseMutation();

  const feedLoaded = !!data && cases.length > 0;

  useEffect(() => {
    if (feedLoaded) {
      const savedScroll = sessionStorage.getItem(FEED_SCROLL_KEY);
      if (savedScroll && feedScrollRef.current) {
        const timer = setTimeout(() => {
          if (feedScrollRef.current) {
            feedScrollRef.current.scrollTop = Number(savedScroll);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [feedLoaded]);

  const saveFeedScroll = () => {
    if (feedScrollRef.current) {
      sessionStorage.setItem(FEED_SCROLL_KEY, String(feedScrollRef.current.scrollTop));
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
    setSkip(0);
  }, [initialTab]);

  const fetchTopJudges = React.useCallback(async () => {
    setIsLoadingTopJudges(true);
    try {
      const data = await apiClient.get<any[]>('/users/top-judges?take=20');
      setTopJudgesCases(data || []);
    } catch (err) {
      console.error('Error fetching top judges:', err);
      setTopJudgesCases([]);
    } finally {
      setIsLoadingTopJudges(false);
    }
  }, []);

  useEffect(() => {
    if (isTopJudges) {
      fetchTopJudges();
    }
  }, [isTopJudges, fetchTopJudges]);

  const handleLoadMore = React.useCallback(() => {
    if (!hasMore || isFetching) return;
    setSkip((prev) => prev + FEED_PAGE_SIZE);
  }, [hasMore, isFetching]);

  const handleCategoryChange = React.useCallback((category: string) => {
    setSelectedCategory(category);
    setSkip(0);
  }, []);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: isFetching,
  });

  const openAuthModal = () => {
    navigate('/login');
  };

  const handleSelectCase = React.useCallback((caseData: Case | string) => {
    if (typeof caseData === 'string' && (caseData === 'trending' || caseData === 'top-judges')) {
      setActiveTab(caseData);
      setSkip(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (typeof caseData === 'string') {
      saveFeedScroll();
      navigate(`/cases/${caseData}`);
      return;
    }

    saveFeedScroll();
    navigate(getCasePath(caseData));
  }, [navigate, setActiveTab, saveFeedScroll]);

  const handleViewProfile = React.useCallback((username: string) => {
    if (username === 'top-judges') return;
    saveFeedScroll();
    navigate(`/users/${username}`);
  }, [navigate, saveFeedScroll]);

  const handleVote = React.useCallback(async (caseId: string, side: 'A' | 'B' | 'BothWrong') => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const apiSide = side === 'BothWrong' ? 'BOTH_WRONG' : side;
    try {
      await voteCase({ caseId, voteType: apiSide }).unwrap();

      const updatedUser = {
        ...currentUser,
        votes: { ...currentUser.votes, [caseId]: apiSide as 'A' | 'B' | 'BOTH_WRONG' }
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('etribunal_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error voting:', error);
    }
  }, [currentUser, voteCase, setCurrentUser]);

  const handleToggleSave = React.useCallback(async (caseId: string) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const currentCase = cases.find(c => c.id === caseId);
    const wasSaved = currentCase?.isSaved;

    try {
      await saveCase({ caseId }).unwrap();
      showToast(wasSaved ? t('toasts.caseUnanchored') : t('toasts.caseAnchored'), 'success');
    } catch (error) {
      console.error('Error toggling save:', error);
      showToast(t('toasts.errorProcessingAnchor'), 'error');
    }
  }, [currentUser, cases, saveCase, t]);

  const handleReaction = React.useCallback(async (caseId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    try {
      await reactToCase({ caseId, emoji }).unwrap();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      showToast(t('toasts.errorProcessingReaction'), 'error');
    }
  }, [currentUser, reactToCase, t]);

  const handleFollowUser = async (userId: string, username: string) => {
    if (!currentUser) return;
    try {
      await apiClient.post<{ following: boolean }>(`/users/${username}/follow`, {});
      await fetchTopJudges();
    } catch (error: any) {
      console.error('Follow error:', error);
      showToast(error?.response?.data?.message || 'Error following user', 'error');
    }
  };

  const handleAddComment = React.useCallback(async (caseId: string, text: string, parentId?: string) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    try {
      await addComment({ caseId, content: text, parentId }).unwrap();
      await refetch();
      showToast(t('toasts.verdictSentSuccess'), 'success');
    } catch (error) {
      console.error('Error adding verdict:', error);
      showToast(t('toasts.errorAddingVerdict'), 'error');
    }
  }, [currentUser, addComment, refetch, t]);

  const handleShareClose = React.useCallback(() => {
    setShowShareModal(false);
    if (pendingShareId) {
      const caseId = pendingShareId;
      dispatch(incrementCaseShareCount(caseId));
      setPendingShareId(null);
    }
  }, [dispatch, pendingShareId]);

  const handleShareOpen = React.useCallback((caseId: string) => {
    const c = cases.find(item => item.id === caseId);
    if (c) {
      setPendingShareId(c.id);
      setShareData({ type: 'case', id: c.id, title: c.title, username: c.sideA?.username });
      setShowShareModal(true);
    }
  }, [cases]);

  const titles: Record<string, string> = {
    for_you: t('feed.forYou'),
    following: t('feed.following'),
    trending: t('feed.trending'),
    'top-judges': t('feed.topJudges'),
  };

  return (
    <main
      ref={feedScrollRef}
      onScroll={saveFeedScroll}
      className="flex-1 px-1 md:px-4 pb-32 lg:pb-12 w-full box-border overflow-x-hidden overflow-y-auto no-scrollbar"
      role="main"
    >
      <SEO 
        title={titles[initialTab] || ''}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'eTRIBUNAL',
          url: import.meta.env.VITE_APP_URL || 'http://localhost:3000',
          description: 'Voz. Debate. Sentencia',
        }}
      />
      <AnimatePresence>
        {inviteNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 flex items-start justify-between gap-3"
          >
            <p className="text-xs font-semibold text-text-main leading-relaxed">{inviteNotice}</p>
            <Tooltip content={t('tooltips.dismiss')}>
              <button
                onClick={() => setInviteNotice(null)}
                className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0"
              >
                {t('common.close')}
              </button>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {!isTopJudges && (
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {!isTopJudges && (
<motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
            ⚡ <span className="text-text-main">{t('nav.feedBannerTitle')}</span>
            <span className="text-secondary"> {t('nav.feedBannerTitleHighlight')}</span>
          </h1>
          <p className="text-text-muted text-sm font-medium mt-1">
            {t('nav.feedBannerSubtitle')} 👇
          </p>
        </motion.div>
      )}

      <div className="space-y-5 px-0">
        {isTopJudges ? (
          <TopJudgesList
            judges={topJudgesCases}
            isLoading={isLoadingTopJudges}
            onFollow={handleFollowUser}
            onViewProfile={handleViewProfile}
            onOpenAuth={openAuthModal}
            isLoggedIn={!!currentUser}
          />
        ) : cases.length > 0 ? (
          <>
            <CaseList
              cases={cases}
              currentUserId={currentUser?.id}
              userVotes={currentUser?.votes as Record<string, 'A' | 'B' | 'BOTH_WRONG'> | undefined}
              onOpenDetail={handleSelectCase}
              onViewProfile={handleViewProfile}
              onShare={handleShareOpen}
              onVote={handleVote}
              onToggleSave={handleToggleSave}
              onReaction={handleReaction}
              onAddComment={handleAddComment}
              isVoting={isVotePending}
              isSaving={isSavePending}
              isLoading={isFetching}
              hasMore={hasMore}
              onOpenAuth={openAuthModal}
            />
            <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center">
              {isFetching && (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              )}
            </div>
          </>
        ) : (
          isLoading ? (
            <FeedSkeleton />
          ) : (
            <EmptyState 
              titleKey="profile.noCasesFound" 
            />
          )
        )}
      </div>
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={handleShareClose}
          type={shareData.type}
          id={shareData.id}
          title={shareData.title}
          username={shareData.username}
        />
      )}
    </main>
  );
}