import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@utils/helpers';
import { getDisplayName, getAnonymousAvatar } from '@services/anonymity';
import { UserCardSkeleton } from '@shared/components/Skeleton';

interface TopJudge {
  id: string;
  username: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  followers_count: number;
  is_following: boolean;
}

interface TopJudgesListProps {
  judges: TopJudge[];
  isLoading: boolean;
  onFollow: (userId: string, username: string) => void;
  onViewProfile: (username: string) => void;
  onOpenAuth?: () => void;
  isLoggedIn?: boolean;
}

export function TopJudgesList({ judges, isLoading, onFollow, onViewProfile, onOpenAuth, isLoggedIn }: TopJudgesListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <UserCardSkeleton />
        <UserCardSkeleton />
        <UserCardSkeleton />
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 w-full text-xs font-bold text-text-muted tracking-widest py-2">
        {t('profile.noUsersFound')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {judges.map((user) => (
        <div 
          key={user.id} 
          className="p-4 bg-card border border-border-main/5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-2xl cursor-pointer"
          onClick={() => onViewProfile(user.username)}
        >
          <div className="flex items-center gap-3">
            <img
              src={user.is_anonymous ? getAnonymousAvatar(user.id) : (user.avatar_url || 'https://picsum.photos/seed/default/100/100')}
              className="w-12 h-12 rounded-full border border-border-main/20 object-cover"
              alt={user.username}
            />
            <div className="flex-1">
              <h4 className="font-black text-sm text-text-main">
                {getDisplayName(user.username, user.is_anonymous, user.id)}
              </h4>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                {formatNumber(user.followers_count)} {t('profile.followers').toLowerCase()}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoggedIn) {
                  onOpenAuth?.();
                  return;
                }
                onFollow(user.id, user.username);
              }}
              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors"
            >
              {user.is_following ? t('profile.following') : t('profile.follow')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
