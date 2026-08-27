import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Users, UserX, BookmarkCheck, Gavel, History, Share2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Case, User } from '@typings/index';
import { cn, getCasePath } from '@utils/helpers';
import { apiClient } from '@api/client';
import { Skeleton } from '@components/ui/Skeleton';
import { mapDbCaseToCase } from '@shared/utils/caseMapper';
import { DeleteAccountModal } from '@components/ui/DeleteAccountModal';
import { useToast } from '@components/ui/Toast';
import { ProfileHeader } from '@components/ui/ProfileHeader';
import { ProfileStats } from '@components/ui/ProfileStats';
import { AvatarEditModal } from '@components/ui/AvatarEditModal';
import { useAuth } from '@context/AuthContext';
import { PageLayout } from '@layout/PageLayout';
import { ShareModal } from '@components/ui/ShareModal';
import type { ShareType } from '@hooks/useShare';
import { useInfiniteScroll } from '@shared/hooks/useInfiniteScroll';
import { SEO } from '@shared/components/SEO';
import { CaseCard } from '@components/ui/CaseCard';
import { useVote } from '@hooks/useVote';
import { useSavedCases } from '@hooks/useSavedCases';
import { useReactions } from '@hooks/useReactions';
import { useComments } from '@hooks/useComments';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { currentUser, logout } = useAuth();
  const { voteForCase } = useVote();
  const { toggleSave: toggleSaveCase } = useSavedCases();
  const { toggleReaction: toggleCaseReaction } = useReactions();
  const { addComment } = useComments();

  const targetUsername = username || currentUser?.name;
  const isOwnProfile = currentUser?.name === targetUsername;

  const [profileData, setProfileData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ type: ShareType; id: string; title?: string; username?: string }>({ type: 'profile', id: '' });
  const [isFollowingLocal, setIsFollowingLocal] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [confirmFollow, setConfirmFollow] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAvatarEditModal, setShowAvatarEditModal] = useState(false);
  const [savedCasesTab, setSavedCasesTab] = useState<'created' | 'saved' | 'voted'>('created');
  const [savedCases, setSavedCases] = useState<any[]>([]);
  const [createdCases, setCreatedCases] = useState<any[]>([]);
  const [votedCases, setVotedCases] = useState<any[]>([]);
  const [loadingSavedCases, setLoadingSavedCases] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const [skipCreated, setSkipCreated] = useState(0);
  const [hasMoreCreated, setHasMoreCreated] = useState(true);
  const [skipSaved, setSkipSaved] = useState(0);
  const [hasMoreSaved, setHasMoreSaved] = useState(true);
  const [skipVoted, setSkipVoted] = useState(0);
  const [hasMoreVoted, setHasMoreVoted] = useState(true);
  const TAKE = 10;

  const updateCaseInProfile = useCallback((caseId: string, updates: Partial<Case>) => {
    setCreatedCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updates } : c));
    setSavedCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updates } : c));
    setVotedCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updates } : c));
  }, []);

  useEffect(() => {
    if (targetUsername) {
      fetchProfile();
      fetchCreatedCases();
      if (isOwnProfile) {
        fetchSavedCases();
        fetchVotedCases();
      }
    }
  }, [targetUsername, isOwnProfile]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>(`/users/${targetUsername}`);
      const mapped: User = {
        id: data.id,
        name: data.username,
        email: data.email || '',
        avatar: data.avatar_url,
        bio: data.bio || '',
        casesCreated: [],
        votes: {},
        followersCount: data._count?.followers || 0,
        followingCount: data._count?.following || 0,
        casesCount: data.casesCount || 0,
        is_following: data.is_following,
      };
      setProfileData(mapped);
      setIsFollowingLocal(data.is_following);
    } catch (err) {
      console.error('Error fetching profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!profileData || isOwnProfile || isFollowingLoading) return;

    if (isFollowingLocal && !confirmFollow) {
      setConfirmFollow(true);
      setTimeout(() => setConfirmFollow(false), 3000);
      return;
    }

    setConfirmFollow(false);
    setIsFollowingLoading(true);
    try {
      const result = await apiClient.post<any>(`/users/${targetUsername}/follow`, {});
      setIsFollowingLocal(result.following);
      setProfileData(prev => prev ? {
        ...prev,
        followersCount: (prev.followersCount || 0) + (result.following ? 1 : -1)
      } : null);
    } catch (err: any) {
      console.error('Error toggling follow', err);
      const message = err?.response?.data?.message || err.message || t('errors.genericError');
      addToast('error', message);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const fetchFollowers = async () => {
    if (!targetUsername) return;
    setLoadingFollowers(true);
    try {
      const data = await apiClient.get<any[]>(`/users/${targetUsername}/followers`);
      setFollowersList(data);
      setShowFollowers(true);
    } catch (err) {
      console.error('Error fetching followers', err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchFollowing = async () => {
    if (!targetUsername) return;
    setLoadingFollowers(true);
    try {
      const data = await apiClient.get<any[]>(`/users/${targetUsername}/following`);
      setFollowingList(data);
      setShowFollowing(true);
    } catch (err) {
      console.error('Error fetching following', err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchCreatedCases = async (skip: number = 0) => {
    if (skip === 0) setLoadingSavedCases(true);
    try {
      const data = await apiClient.get<any>(`/users/${targetUsername}/cases?skip=${skip}&take=${TAKE}`);
      const rawCases = Array.isArray(data) ? data : (data.cases || []);
      const mapped = rawCases.map((c: any) => mapDbCaseToCase(c, currentUser?.id));

      if (skip === 0) {
        setCreatedCases(mapped);
      } else {
        setCreatedCases(prev => [...prev, ...mapped]);
      }
      setHasMoreCreated(mapped.length === TAKE);
      setSkipCreated(skip + mapped.length);
    } catch (err) {
      console.error('Error fetching created cases', err);
    } finally {
      setLoadingSavedCases(false);
    }
  };

  const fetchSavedCases = async (skip: number = 0) => {
    if (!isOwnProfile) return;
    if (skip === 0) setLoadingSavedCases(true);
    try {
      const data = await apiClient.get<any>(`/saved-cases?skip=${skip}&take=${TAKE}`);
      const rawCases = Array.isArray(data) ? data : (data.cases || []);
      const mapped = rawCases.map((c: any) => {
        const normalized = { ...c, id: c.case_id || c.id };
        return mapDbCaseToCase(normalized, currentUser?.id);
      });

      if (skip === 0) {
        setSavedCases(mapped);
      } else {
        setSavedCases(prev => [...prev, ...mapped]);
      }
      setHasMoreSaved(mapped.length === TAKE);
      setSkipSaved(skip + mapped.length);
    } catch (err) {
      console.error('Error fetching saved cases', err);
    } finally {
      setLoadingSavedCases(false);
    }
  };

  const fetchVotedCases = async (skip: number = 0) => {
    if (!isOwnProfile) return;
    if (skip === 0) setLoadingSavedCases(true);
    try {
      const data = await apiClient.get<any>(`/users/me/votes?skip=${skip}&take=${TAKE}`);
      const rawCases = Array.isArray(data) ? data : (data.cases || []);
      const mapped = rawCases.map((c: any) => mapDbCaseToCase(c, currentUser?.id));

      if (skip === 0) {
        setVotedCases(mapped);
      } else {
        setVotedCases(prev => [...prev, ...mapped]);
      }
      setHasMoreVoted(mapped.length === TAKE);
      setSkipVoted(skip + mapped.length);
    } catch (err) {
      console.error('Error fetching voted cases', err);
    } finally {
      setLoadingSavedCases(false);
    }
  };

  const loadMoreCreated = () => {
    if (hasMoreCreated && !loadingSavedCases) {
      fetchCreatedCases(skipCreated);
    }
  };

  const loadMoreSaved = () => {
    if (hasMoreSaved && !loadingSavedCases) {
      fetchSavedCases(skipSaved);
    }
  };

  const loadMoreVoted = () => {
    if (hasMoreVoted && !loadingSavedCases) {
      fetchVotedCases(skipVoted);
    }
  };

  const { loadMoreRef: loadMoreCreatedRef } = useInfiniteScroll({
    onLoadMore: loadMoreCreated,
    hasMore: hasMoreCreated,
    isLoading: loadingSavedCases
  });

  const { loadMoreRef: loadMoreSavedRef } = useInfiniteScroll({
    onLoadMore: loadMoreSaved,
    hasMore: hasMoreSaved,
    isLoading: loadingSavedCases
  });

  const { loadMoreRef: loadMoreVotedRef } = useInfiniteScroll({
    onLoadMore: loadMoreVoted,
    hasMore: hasMoreVoted,
    isLoading: loadingSavedCases
  });

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      await apiClient.delete('/users/account/me', { data: { username: currentUser.name } });
      localStorage.removeItem('etribunal_token');
      localStorage.removeItem('etribunal_user');
      logout();
      setShowDeleteModal(false);
      navigate('/');
    } catch (err: any) {
      console.error('Error deleting account', err);
      addToast('error', err.message || t('errors.genericError'));
    }
  };

  const handleSelectCase = (caseData: Case) => {
    navigate(getCasePath(caseData));
  };

  const handleViewProfile = useCallback((username: string) => {
    navigate(`/users/${username}`);
  }, [navigate]);

  const handleVote = useCallback(async (caseId: string, side: 'A' | 'B' | 'BothWrong') => {
    if (!currentUser) { navigate('/login'); return; }
    setIsVoting(true);
    try {
      const apiSide = side === 'BothWrong' ? 'BOTH_WRONG' : side;
      const data = await voteForCase(caseId, apiSide);
      if (data) {
        updateCaseInProfile(caseId, {
          votesA: data.votes_a,
          votesB: data.votes_b,
          votesBothWrong: data.votes_both_wrong,
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  }, [currentUser, voteForCase, updateCaseInProfile, navigate]);

  const handleToggleSave = useCallback(async (caseId: string) => {
    if (!currentUser) { navigate('/login'); return; }
    setIsSaving(true);
    try {
      const result = await toggleSaveCase(caseId);
      if (result !== undefined) {
        updateCaseInProfile(caseId, {
          isSaved: result.saved,
          anchorsCount: result.anchorsCount,
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, toggleSaveCase, updateCaseInProfile, navigate]);

  const handleReaction = useCallback(async (caseId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => {
    if (!currentUser) { navigate('/login'); return; }
    setIsReacting(true);
    try {
      const data = await toggleCaseReaction('CASE', caseId, emoji);
      if (data) {
        const formattedReactions = { LIKE: 0, LOVE: 0, ANGRY: 0 };
        data.reactions.forEach((r: any) => {
          if ((formattedReactions as any)[r.emoji] !== undefined) {
            (formattedReactions as any)[r.emoji] = r.count;
          }
        });
        updateCaseInProfile(caseId, {
          reactions: formattedReactions,
          userReaction: data.user_reaction,
        });
      }
    } catch (error) {
      console.error('Error reacting:', error);
    } finally {
      setIsReacting(false);
    }
  }, [currentUser, toggleCaseReaction, updateCaseInProfile, navigate]);

  const handleAddComment = useCallback(async (caseId: string, text: string) => {
    if (!currentUser) { navigate('/login'); return; }
    try {
      await addComment(caseId, text);
      const current = createdCases.find(c => c.id === caseId);
      if (current) {
        updateCaseInProfile(caseId, {
          commentsCount: (current.commentsCount || 0) + 1,
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [currentUser, addComment, updateCaseInProfile, createdCases, navigate]);

  const handleShareOpen = useCallback((caseId: string) => {
    const c = createdCases.find(item => item.id === caseId) ||
             savedCases.find(item => item.id === caseId) ||
             votedCases.find(item => item.id === caseId);
    if (c) {
      setShareData({ type: 'case', id: c.id, title: c.title, username: c.sideA?.username });
      setShowShareModal(true);
    }
  }, [createdCases, savedCases, votedCases]);

  const displayUser = profileData || (isOwnProfile ? currentUser : null);

  if (!displayUser && !loading) {
    return (
      <PageLayout title={t('profile.judgeProfile')}>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted">User not found</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={isOwnProfile ? t('profile.myJudgeProfile') : t('profile.judgeProfile')}
      rightButton={isOwnProfile ? [
        {
          icon: Share2,
          onClick: () => {
            setShareData({ type: 'profile', id: displayUser?.id || '', username: displayUser?.name || '' });
            setShowShareModal(true);
          },
          tooltip: t('share.shareThis')
        },
        {
          icon: Settings,
          onClick: () => navigate('/settings'),
          tooltip: t('tooltips.settings')
        },
        {
          icon: LogOut,
          onClick: () => { logout(); navigate('/'); },
          tooltip: t('profile.logOut'),
          className: "text-secondary hover:bg-secondary/10"
        }
      ] : {
        icon: Share2,
        onClick: () => {
          setShareData({ type: 'profile', id: displayUser?.id || '', username: displayUser?.name || '' });
          setShowShareModal(true);
        },
        tooltip: t('share.shareThis')
      }}
    >
      <SEO 
        title={displayUser?.username || targetUsername || ''}
        description={`Perfil de ${displayUser?.username || targetUsername || ''} en eTRIBUNAL`}
        image={displayUser?.avatar || undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          name: displayUser?.username || targetUsername || '',
          image: displayUser?.avatar || undefined,
        }}
      />
      <div className="flex-1 px-3 md:px-4 py-6 space-y-10 pb-10 bg-card/50 rounded-[32px] border border-border-main/5">
        {loading || !displayUser ? (
          <section className="flex flex-col space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="w-28 h-28 rounded-[44px]" />
              <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              {!isOwnProfile && <Skeleton className="w-32 h-10 rounded-2xl" />}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-[28px]" />)}
            </div>
            <Skeleton className="h-20 w-full rounded-[32px]" />
          </section>
        ) : (
          <>
            <ProfileHeader
              user={displayUser as any}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowingLocal}
              isFollowingLoading={isFollowingLoading}
              confirmFollow={confirmFollow}
              onFollowToggle={handleFollowToggle}
              onEditAvatar={isOwnProfile ? () => setShowAvatarEditModal(true) : undefined}
            />

            <ProfileStats
              user={displayUser as any}
              onFollowersClick={fetchFollowers}
              onFollowingClick={fetchFollowing}
            />

            {displayUser.bio && (
              <section className="bg-card/50 border border-border-main/5 rounded-[32px] p-6 text-center">
                <p className="text-sm font-medium text-text-muted italic leading-relaxed">
                  "{displayUser.bio}"
                </p>
              </section>
            )}

            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-text-main">
                    {isOwnProfile ? t('profile.yourCases') : t('profile.usersCases', { name: displayUser.name.split(' ')[0] })}
                  </h3>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSavedCasesTab('created');
                    fetchCreatedCases();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                    savedCasesTab === 'created' ? "bg-primary text-white" : "bg-border-main/10 text-text-muted hover:text-text-main"
                  )}
                >
                  <Gavel className="w-4 h-4" />
                  {t('profile.created')}
                </button>
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => { 
                        setSavedCasesTab('saved'); 
                        fetchSavedCases(); 
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                        savedCasesTab === 'saved' ? "bg-primary text-white" : "bg-border-main/10 text-text-muted hover:text-text-main"
                      )}
                    >
                      <BookmarkCheck className="w-4 h-4" />
                      {t('profile.anclados')}
                    </button>
                    <button
                      onClick={() => { 
                        setSavedCasesTab('voted'); 
                        fetchVotedCases(); 
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                        savedCasesTab === 'voted' ? "bg-primary text-white" : "bg-border-main/10 text-text-muted hover:text-text-main"
                      )}
                    >
                      <History className="w-4 h-4" />
                      {t('profile.voted')}
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-4">
                {loadingSavedCases ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  </div>
                ) : savedCasesTab === 'created' ? (
                  createdCases.length === 0 ? (
                    <div className="py-12 text-center bg-card border border-border-main/10 rounded-[32px]">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-40">
                        {isOwnProfile ? t('profile.noCasesYet') : t('profile.noOpenCases')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {createdCases.map((caseData: any) => (
                        <motion.div
                          key={caseData.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mb-5"
                        >
                          <CaseCard
                            caseData={caseData}
                            currentUserId={currentUser?.id}
                            onOpenDetail={handleSelectCase}
                            onViewProfile={handleViewProfile}
                            onShare={handleShareOpen}
                            userVote={currentUser?.votes?.[caseData.id] as 'A' | 'B' | 'BOTH_WRONG' | undefined}
                            onVote={handleVote}
                            onToggleSave={handleToggleSave}
                            isSaved={caseData.isSaved}
                            anchorsCount={caseData.anchorsCount}
                            sharesCount={caseData.sharesCount}
                            reactions={{ LIKE: caseData.reactions?.LIKE ?? 0, LOVE: caseData.reactions?.LOVE ?? 0, ANGRY: caseData.reactions?.ANGRY ?? 0 }}
                            userReaction={caseData.userReaction}
                            onReaction={handleReaction}
                            onAddComment={handleAddComment}
                            commentsCount={caseData.commentsCount || 0}
                            isVotingThis={isVoting}
                            isSavingThis={isSaving}
                            isReactingThis={isReacting}
                            onOpenAuth={() => navigate('/login')}
                          />
                        </motion.div>
                      ))}
                      <div ref={loadMoreCreatedRef} className="h-4 w-full" />
                      {!loadingSavedCases && hasMoreCreated === false && createdCases.length > 0 && (
                        <div className="w-full flex justify-center py-8">
                          <p className="text-[12px] text-text-muted tracking-widest">
                            No hay más casos por mostrar
                          </p>
                        </div>
                      )}
                    </>
                  )
                ) : savedCasesTab === 'saved' && isOwnProfile ? (
                  savedCases.length === 0 ? (
                    <div className="py-12 text-center bg-card border border-border-main/10 rounded-[32px]">
                      <BookmarkCheck className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-40">
                        {t('profile.noAnclados')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {savedCases.map((caseData: any) => (
                        <motion.div
                          key={caseData.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mb-5"
                        >
                          <CaseCard
                            caseData={caseData}
                            currentUserId={currentUser?.id}
                            onOpenDetail={handleSelectCase}
                            onViewProfile={handleViewProfile}
                            onShare={handleShareOpen}
                            userVote={currentUser?.votes?.[caseData.id] as 'A' | 'B' | 'BOTH_WRONG' | undefined}
                            onVote={handleVote}
                            onToggleSave={handleToggleSave}
                            isSaved={caseData.isSaved}
                            anchorsCount={caseData.anchorsCount}
                            sharesCount={caseData.sharesCount}
                            reactions={{ LIKE: caseData.reactions?.LIKE ?? 0, LOVE: caseData.reactions?.LOVE ?? 0, ANGRY: caseData.reactions?.ANGRY ?? 0 }}
                            userReaction={caseData.userReaction}
                            onReaction={handleReaction}
                            onAddComment={handleAddComment}
                            commentsCount={caseData.commentsCount || 0}
                            isVotingThis={isVoting}
                            isSavingThis={isSaving}
                            isReactingThis={isReacting}
                            onOpenAuth={() => navigate('/login')}
                          />
                        </motion.div>
                      ))}
                      <div ref={loadMoreSavedRef} className="h-4 w-full" />
                      {!loadingSavedCases && hasMoreSaved === false && savedCases.length > 0 && (
                        <div className="w-full flex justify-center py-8">
                          <p className="text-[12px] text-text-muted tracking-widest">
                            No hay más casos por mostrar
                          </p>
                        </div>
                      )}
                    </>
                  )
                ) : savedCasesTab === 'voted' && isOwnProfile ? (
                  votedCases.length === 0 ? (
                    <div className="py-12 text-center bg-card border border-border-main/10 rounded-[32px]">
                      <History className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-40">
                        {t('profile.noVotedCases')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {votedCases.map((caseData: any) => (
                        <motion.div
                          key={caseData.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mb-5"
                        >
                          <CaseCard
                            caseData={caseData}
                            currentUserId={currentUser?.id}
                            onOpenDetail={handleSelectCase}
                            onViewProfile={handleViewProfile}
                            onShare={handleShareOpen}
                            userVote={currentUser?.votes?.[caseData.id] as 'A' | 'B' | 'BOTH_WRONG' | undefined}
                            onVote={handleVote}
                            onToggleSave={handleToggleSave}
                            isSaved={caseData.isSaved}
                            anchorsCount={caseData.anchorsCount}
                            sharesCount={caseData.sharesCount}
                            reactions={{ LIKE: caseData.reactions?.LIKE ?? 0, LOVE: caseData.reactions?.LOVE ?? 0, ANGRY: caseData.reactions?.ANGRY ?? 0 }}
                            userReaction={caseData.userReaction}
                            onReaction={handleReaction}
                            onAddComment={handleAddComment}
                            commentsCount={caseData.commentsCount || 0}
                            isVotingThis={isVoting}
                            isSavingThis={isSaving}
                            isReactingThis={isReacting}
                            onOpenAuth={() => navigate('/login')}
                          />
                        </motion.div>
                      ))}
                      <div ref={loadMoreVotedRef} className="h-4 w-full" />
                      {!loadingSavedCases && hasMoreVoted === false && votedCases.length > 0 && (
                        <div className="w-full flex justify-center py-8">
                          <p className="text-[12px] text-text-muted tracking-widest">
                            No hay más casos por mostrar
                          </p>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="py-12 text-center bg-card border border-border-main/10 rounded-[32px]">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-40">
                      {isOwnProfile ? t('profile.noCasesYet') : t('profile.noOpenCases')}
                    </p>
                  </div>
                )}
              </div>
            </section>


          </>
        )}
      </div>

      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowFollowers(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-card border border-border-main/10 rounded-[40px] p-6 max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                    {t('profile.followers')}
                  </h3>
                </div>
                <button onClick={() => setShowFollowers(false)} className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-text-main" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                {loadingFollowers ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  </div>
                ) : followersList.length === 0 ? (
                  <div className="py-12 text-center">
                    <UserX className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-60">
                      {t('profile.noFollowersYet')}
                    </p>
                  </div>
                ) : (
                  followersList.map((follower: any) => (
                    <div key={follower.follower.id} className="w-full flex items-center gap-4 p-4 bg-border-main/5 border border-border-main/10 rounded-[24px]">
                      <button onClick={() => { setShowFollowers(false); navigate(`/users/${follower.follower.username}`); }}>
                        <img src={follower.follower.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      </button>
                      <button onClick={() => { setShowFollowers(false); navigate(`/users/${follower.follower.username}`); }} className="flex-1 text-left">
                        <p className="text-sm font-black uppercase tracking-tight text-text-main">{follower.follower.username}</p>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Following Modal */}
      <AnimatePresence>
        {showFollowing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowFollowing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-card border border-border-main/10 rounded-[40px] p-6 max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                    {t('profile.following')}
                  </h3>
                </div>
                <button onClick={() => setShowFollowing(false)} className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-text-main" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                {loadingFollowers ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  </div>
                ) : followingList.length === 0 ? (
                  <div className="py-12 text-center">
                    <UserX className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest italic opacity-60">
                      {t('profile.notFollowingAnyone')}
                    </p>
                  </div>
                ) : (
                  followingList.map((followed: any) => (
                    <div key={followed.following.id} className="w-full flex items-center gap-4 p-4 bg-border-main/5 border border-border-main/10 rounded-[24px]">
                      <button onClick={() => { setShowFollowing(false); navigate(`/users/${followed.following.username}`); }}>
                        <img src={followed.following.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      </button>
                      <button onClick={() => { setShowFollowing(false); navigate(`/users/${followed.following.username}`); }} className="flex-1 text-left">
                        <p className="text-sm font-black uppercase tracking-tight text-text-main">{followed.following.username}</p>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        username={currentUser?.name || ''}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />

      {showAvatarEditModal && (
        <AvatarEditModal
          onClose={() => setShowAvatarEditModal(false)}
          onSaved={(url) => {
            setProfileData((prev) => (prev ? { ...prev, avatar: url } : prev));
          }}
        />
      )}

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          type={shareData.type}
          id={shareData.id}
          title={shareData.title}
          username={shareData.username}
        />
      )}
    </PageLayout>
  );
};
