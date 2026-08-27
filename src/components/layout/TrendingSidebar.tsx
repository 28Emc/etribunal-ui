import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, MessageSquare, Scale, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient, authStorage, getCircuitState } from '@api/client';
import { getDisplayName, getAnonymousAvatar } from '@services/anonymity';
import { cn, formatNumber, createSlug } from '@utils/helpers';
import { ConfirmModal } from '@shared/components/ConfirmModal';
import { UserCard } from '@shared/components/UserCard';
import { ReactionIcon } from '@shared/components/ReactionIcon';
import { Skeleton, TrendingCaseSkeleton, UserCardSkeleton } from '@shared/components/Skeleton';

interface TrendingCase {
  id: string;
  title: string;
  category: string;
  votes_a: number;
  votes_b: number;
  votes_both_wrong: number;
  _count?: { comments: number; reactions: number };
  reactions_summary?: { counts: { LIKE: number; LOVE: number; ANGRY: number } };
  side_a_user: { username: string; is_anonymous: boolean; id: string };
  side_a_username?: string;
}

interface TopJudge {
  id: string;
  username: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  followers_count: number;
  is_following?: boolean;
}

interface TrendingSidebarProps {
  onSelectCase?: (caseId: string) => void;
  onSelectProfile?: (username: string) => void;
  refreshKey?: number;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenGuidelines?: () => void;
  onOpenAbout?: () => void;
  onOpenAuth?: () => void;
  isMobile?: boolean;
}

interface ActiveUsers {
  users: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_anonymous: boolean;
  }[];
  total: number;
}

const defaultCallback = () => { };

export const TrendingSidebar: React.FC<TrendingSidebarProps> = React.memo(({
  onSelectCase,
  onSelectProfile,
  refreshKey,
  onOpenTerms,
  onOpenPrivacy,
  onOpenGuidelines,
  onOpenAbout,
  onOpenAuth,
  isMobile = false
}) => {
  const { t } = useTranslation();
  const [trendingCases, setTrendingCases] = useState<TrendingCase[]>([]);
  const [topJudges, setTopJudges] = useState<TopJudge[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUsers | null>(null);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingJudges, setIsLoadingJudges] = useState(true);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingTrending(true);
      setIsLoadingJudges(true);
      try {
        const [trendingData, judgesData]: [any, any] = await Promise.all([
          apiClient.get('/cases/trending/top'),
          apiClient.get('/users/top-judges')
        ]);
        setTrendingCases(trendingData.slice(0, 3));
        setTopJudges(judgesData.slice(0, 3));

        const initialFollowing = new Set<string>();
        (judgesData as TopJudge[]).forEach((judge) => {
          if (judge.is_following) {
            initialFollowing.add(judge.id);
          }
        });
        setFollowingIds(initialFollowing);
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setIsLoadingTrending(false);
        setIsLoadingJudges(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      if (getCircuitState('/cases/active-users', 'GET') === 'OPEN') return;
      
      try {
        const activeData = await (apiClient.get('/cases/active-users') as any).catch(() => ({ users: [], total: 0 }));
        setActiveUsers(activeData);
        setIsLoadingActive(false);
      } catch (error) {
        console.error('Error fetching active users:', error);
        setIsLoadingActive(false);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(() => {
      if (getCircuitState('/cases/active-users', 'GET') !== 'OPEN') {
        fetchActiveUsers();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleFollow = async (userId: string, username: string) => {
    if (!authStorage.isAuthenticated()) {
      onOpenAuth?.();
      return;
    }

    setLoadingUsers(prev => new Set(prev).add(userId));
    try {
      const result = await (apiClient.post(`/users/${username}/follow`, {}) as any);
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (result.following) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoadingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <div className={isMobile ? "flex flex-col py-4 space-y-6" : "flex flex-col py-8 space-y-10"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <TrendingUp className={isMobile ? "w-4 h-4 text-primary" : "w-5 h-5 text-primary"} />
            <h3 className={isMobile ? "text-sm font-black italic tracking-tighter uppercase text-text-main" : "text-lg font-black italic tracking-tighter uppercase text-text-main"}>{t('sidebar.trending')}</h3>
          </div>
          <button
            onClick={() => onSelectCase?.('trending')}
            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
          >
            {t('common.viewAll')}
          </button>
        </div>

        <div className={isMobile ? "space-y-2" : "space-y-4"}>
          {isLoadingTrending ? (
            <div className={isMobile ? "space-y-2" : "space-y-4"}>
              <TrendingCaseSkeleton />
              <TrendingCaseSkeleton />
            </div>
          ) : trendingCases.length > 0 ? (
            trendingCases.map((c, i) => {
              const username = c.side_a_username || c.side_a_user?.username;
              const caseUrl = username 
                ? `/cases/${username}/${createSlug(c.title)}` 
                : `/cases/${c.id}`;
              return (
                <motion.div
                  key={c.id}
                  whileHover={{ x: 5 }}
                  onClick={() => onSelectCase?.(caseUrl)}
                  className={isMobile ? "p-3 bg-card border border-border-main/5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-2xl hover:bg-border-main/5 transition-all cursor-pointer group" : "p-4 bg-card border border-border-main/5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-[24px] hover:bg-border-main/5 transition-all cursor-pointer group"}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">{c.category}</span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">#{i + 1}</span>
                  </div>
                  <h4 className={isMobile ? "font-black text-sm leading-tight italic uppercase tracking-tighter text-text-main group-hover:text-primary transition-colors mb-2" : "font-black text-lg leading-tight italic uppercase tracking-tighter text-text-main group-hover:text-primary transition-colors mb-2"}>{c.title}</h4>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {formatNumber(c._count?.comments || 0)}</span>
                    {(c.reactions_summary?.counts?.LIKE ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><ReactionIcon type="LIKE" size="sm" /> {formatNumber(c.reactions_summary?.counts?.LIKE ?? 0)}</span>
                    )}
                    {(c.reactions_summary?.counts?.LOVE ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><ReactionIcon type="LOVE" size="sm" /> {formatNumber(c.reactions_summary?.counts?.LOVE ?? 0)}</span>
                    )}
                    {(c.reactions_summary?.counts?.ANGRY ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><ReactionIcon type="ANGRY" size="sm" /> {formatNumber(c.reactions_summary?.counts?.ANGRY ?? 0)}</span>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-10 w-full text-xs font-bold text-text-muted tracking-widest py-2">
              {t('sidebar.noTrending')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Scale className={isMobile ? "w-4 h-4 text-secondary" : "w-5 h-5 text-secondary"} />
            <h3 className={isMobile ? "text-sm font-black italic tracking-tighter uppercase text-text-main" : "text-lg font-black italic tracking-tighter uppercase text-text-main"}>{t('sidebar.topJudges')}</h3>
          </div>
          <button
            onClick={() => onSelectCase?.('top-judges')}
            className="text-[10px] font-black text-secondary uppercase tracking-widest hover:underline"
          >
            {t('common.viewAll')}
          </button>
        </div>

        <div className={isMobile ? "space-y-2" : "space-y-4"}>
          {isLoadingJudges ? (
            <div className={isMobile ? "space-y-2" : "space-y-4"}>
              <UserCardSkeleton />
              <UserCardSkeleton />
            </div>
          ) : topJudges.length > 0 ? (
            topJudges.map((u, i) => (
              <UserCard
                key={u.id}
                id={u.id}
                username={u.username}
                avatarUrl={u.avatar_url}
                isAnonymous={u.is_anonymous}
                followersCount={u.followers_count}
                isFollowing={followingIds.has(u.id)}
                isLoading={loadingUsers.has(u.id)}
                onFollow={handleFollow}
                onClick={onSelectProfile}
                showCrown={i === 0}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-10 w-full text-xs font-bold text-text-muted tracking-widest py-2">
              {t('profile.noUsersFound')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h3 className={isMobile ? "text-sm font-black italic tracking-tighter uppercase text-text-main" : "text-lg font-black italic tracking-tighter uppercase text-text-main"}>{t('sidebar.votingNow')}</h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex -space-x-3 overflow-hidden px-2">
            {isLoadingActive ? (
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-10 h-10 rounded-full" />
                ))}
              </div>
            ) : activeUsers?.users && activeUsers.users.length > 0 ? (
              <>
                {activeUsers.users.slice(0, isMobile ? 2 : 3).map((u, i) => (
                  <img
                    key={u.id}
                    className={isMobile ? "inline-block h-8 w-8 rounded-full ring-2 ring-background object-cover" : "inline-block h-10 w-10 rounded-full ring-2 ring-background object-cover"}
                    src={u.is_anonymous ? getAnonymousAvatar(u.id) : (u.avatar_url || 'https://picsum.photos/seed/default/100/100')}
                    alt={u.username}
                    referrerPolicy="no-referrer"
                  />
                ))}
                {!isMobile && activeUsers.total > 3 && (
                  <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-background bg-border-main/20 text-[10px] font-black text-text-muted">
                    +{activeUsers.total - 3}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-10 w-full text-xs font-bold text-text-muted tracking-widest py-2">
                {t('sidebar.noActiveUsers')}
              </div>
            )}
          </div>
          {activeUsers && activeUsers.total > 0 && (
            <p className="px-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {activeUsers.total} {t('sidebar.activeUsers')}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-6 border-t border-border-main/10">
        <div className="flex flex-wrap gap-4 text-[10px] font-black text-text-muted uppercase tracking-widest">
          <button onClick={onOpenTerms || defaultCallback} className="hover:text-text-main">{t('layout.terms')}</button>
          <button onClick={onOpenPrivacy || defaultCallback} className="hover:text-text-main">{t('layout.privacy')}</button>
          <button onClick={onOpenGuidelines || defaultCallback} className="hover:text-text-main">{t('layout.guidelines')}</button>
          <button onClick={onOpenAbout || defaultCallback} className="hover:text-text-main">{t('layout.about')}</button>
          <span>© 2026 eTribunal</span>
        </div>
      </div>

      <ConfirmModal
        isOpen={showUnfollowModal}
        title={t('profile.unfollow')}
        message={`¿Dejar de seguir a @${userToUnfollow?.username}?`}
        confirmLabel={t('profile.unfollow')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (userToUnfollow) {
            handleFollow(userToUnfollow.id, userToUnfollow.username);
          }
          setShowUnfollowModal(false);
          setUserToUnfollow(null);
        }}
        onCancel={() => {
          setShowUnfollowModal(false);
          setUserToUnfollow(null);
        }}
        variant="danger"
      />
    </div>
  );
});
