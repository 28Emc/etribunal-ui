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
import { useCases } from '@hooks/useCases';
import { useSavedCases } from '@hooks/useSavedCases';
import { useVote } from '@hooks/useVote';
import { useReactions } from '@hooks/useReactions';
import { useComments } from '@hooks/useComments';
import { useToast } from '@components/ui/Toast';
import type { Case } from '@typings/index';
import { apiClient } from '@api/client';
import { ShareModal } from '@components/ui/ShareModal';
import type { ShareType } from '@hooks/useShare';
import { getCasePath } from '@utils/helpers';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { SEO } from '@components/ui/SEO';

interface FeedPageProps {
  initialTab?: 'for_you' | 'following' | 'trending' | 'top-judges';
}

export function FeedPage({ initialTab = 'for_you' }: FeedPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useAuth();
  
  const { cases, isLoading, fetchCases, hasMore, loadMore, refreshCases, updateCase } = useCases();
  const { toggleSave: toggleSaveCase } = useSavedCases();
  const { voteForCase } = useVote();
  const { toggleReaction: toggleCaseReaction } = useReactions();
  const { addComment } = useComments();
  const { addToast } = useToast();
  
  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning') => addToast(type, msg);

  const [activeTab, setActiveTab] = useState<'for_you' | 'following' | 'trending' | 'top-judges'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [isVoting, setIsVoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [topJudgesCases, setTopJudgesCases] = useState<any[]>([]);
  const [isLoadingTopJudges, setIsLoadingTopJudges] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ type: ShareType; id: string; title?: string; username?: string }>({ type: 'case', id: '' });
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const FEED_SCROLL_KEY = 'etribunal_feed_scroll';

  useEffect(() => {
    if (!isLoading && cases.length > 0) {
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
  }, [isLoading, cases.length]);

  const saveFeedScroll = () => {
    if (feedScrollRef.current) {
      sessionStorage.setItem(FEED_SCROLL_KEY, String(feedScrollRef.current.scrollTop));
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
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

  const prevTabRef = useRef(activeTab);
  const prevCategoryRef = useRef(selectedCategory);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    const tabChanged = prevTabRef.current !== activeTab;
    const categoryChanged = prevCategoryRef.current !== selectedCategory;

    if (tabChanged || categoryChanged) {
      sessionStorage.removeItem(FEED_SCROLL_KEY);
      if (feedScrollRef.current) {
        feedScrollRef.current.scrollTop = 0;
      }
      
      prevTabRef.current = activeTab;
      prevCategoryRef.current = selectedCategory;
      
      if (activeTab === 'top-judges') {
        fetchTopJudges();
      } else {
        fetchCases(0, activeTab, selectedCategory, '');
      }
    } else if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      if (activeTab === 'top-judges') {
        fetchTopJudges();
      } else {
        fetchCases(0, activeTab, selectedCategory, '');
      }
    }
  }, [activeTab, selectedCategory, fetchCases, fetchTopJudges]);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading
  });

  const openAuthModal = () => {
    navigate('/login');
  };

  const handleSelectCase = React.useCallback((caseData: Case | string) => {
    if (typeof caseData === 'string' && (caseData === 'trending' || caseData === 'top-judges')) {
      setActiveTab(caseData);
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

    setIsVoting(true);
    try {
      const apiSide = side === 'BothWrong' ? 'BOTH_WRONG' : side;
      const data = await voteForCase(caseId, apiSide);
      
      const updatedUser = {
        ...currentUser,
        votes: { ...currentUser.votes, [caseId]: apiSide as 'A' | 'B' | 'BOTH_WRONG' }
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('etribunal_user', JSON.stringify(updatedUser));
      
      if (data) {
        updateCase(caseId, {
          votesA: data.votes_a,
          votesB: data.votes_b,
          votesBothWrong: data.votes_both_wrong
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  }, [currentUser, voteForCase, setCurrentUser, updateCase]);

  const handleToggleSave = React.useCallback(async (caseId: string) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    const currentCase = cases.find(c => c.id === caseId);
    const wasSaved = currentCase?.isSaved;

    setIsSaving(true);
    try {
      const result = await toggleSaveCase(caseId);
      showToast(wasSaved ? t('toasts.caseUnanchored') : t('toasts.caseAnchored'), 'success');
      
      if (result !== undefined) {
        updateCase(caseId, {
          isSaved: result.saved,
          anchorsCount: result.anchorsCount
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      showToast(t('toasts.errorProcessingAnchor'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, cases, toggleSaveCase, t, updateCase]);

  const handleReaction = React.useCallback(async (
    caseId: string, 
    emoji: 'LIKE' | 'LOVE' | 'ANGRY', 
    targetType: 'CASE' | 'COMMENT' = 'CASE', 
    targetId?: string
  ) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    
    try {
      const data = await toggleCaseReaction(targetType, targetId || caseId, emoji);
      
      if (data && targetType === 'CASE') {
        const formattedReactions = { LIKE: 0, LOVE: 0, ANGRY: 0 };
        data.reactions.forEach((r: any) => {
          if ((formattedReactions as any)[r.emoji] !== undefined) {
             (formattedReactions as any)[r.emoji] = r.count;
          }
        });

        updateCase(caseId, {
          reactions: formattedReactions,
          userReaction: data.user_reaction
        });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      showToast(t('toasts.errorProcessingReaction'), 'error');
    }
  }, [currentUser, toggleCaseReaction, updateCase, t]);

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
      await addComment(caseId, text, parentId);
      await refreshCases();
      showToast(t('toasts.verdictSentSuccess'), 'success');
    } catch (error) {
      console.error('Error adding verdict:', error);
      showToast(t('toasts.errorAddingVerdict'), 'error');
    }
  }, [currentUser, addComment, refreshCases, t]);

  const handleShareClose = React.useCallback(() => {
    setShowShareModal(false);
    if (pendingShareId) {
      const caseItem = cases.find(c => c.id === pendingShareId);
      if (caseItem) {
        updateCase(pendingShareId, {
          sharesCount: (caseItem.sharesCount || 0) + 1
        });
      }
      setPendingShareId(null);
    }
  }, [pendingShareId, cases, updateCase]);

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

      {activeTab !== 'top-judges' && (
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      )}

      {activeTab !== 'top-judges' && (
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
        {activeTab === 'top-judges' ? (
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
              isVoting={isVoting}
              isSaving={isSaving}
              isLoading={isLoading}
              hasMore={hasMore}
              onOpenAuth={openAuthModal}
            />
            <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center">
              {isLoading && (
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
