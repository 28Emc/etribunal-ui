import React from 'react';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User } from '@typings/index';
import { cn } from '@utils/helpers';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isFollowingLoading: boolean;
  confirmFollow: boolean;
  onFollowToggle: () => void;
  onEditAvatar?: () => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing,
  isFollowingLoading,
  confirmFollow,
  onFollowToggle,
  onEditAvatar,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center text-center space-y-4" aria-label="Judge identity">
      <div className="relative">
        <div className="w-28 h-28 rounded-full border-4 border-primary/20 p-1 bg-background shadow-[0_0_50px_rgba(51,102,153,0.2)]">
          <img
            src={user.avatar}
            alt={`${user.name}'s avatar`}
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>
        {isOwnProfile && onEditAvatar && (
          <button
            onClick={onEditAvatar}
            aria-label={t('profile.changeAvatar')}
            className="absolute -bottom-2 -right-2 bg-primary w-11 h-11 rounded-2xl flex items-center justify-center border-4 border-background shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
      <div className="space-y-1">
<h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">{user.name}</h2>
                    {user.is_following && (
          <span className="inline-block text-[10px] font-black text-primary uppercase tracking-[0.3em] px-2 py-0.5 bg-primary/10 rounded-full">{t('profile.followingYou')}</span>
        )}
      </div>

      {!isOwnProfile && (
        <button
          onClick={onFollowToggle}
          disabled={isFollowingLoading}
          aria-pressed={isFollowing}
          className={cn(
            "mt-4 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 focus:ring-4 focus:ring-primary/30 flex items-center gap-2",
isFollowing
                          ? confirmFollow
                            ? "bg-secondary text-white border-secondary"
                            : "bg-border-main/10 text-text-main border border-border-main/10 hover:bg-secondary/10 hover:text-secondary hover:border-secondary/20"
                          : "bg-primary text-white shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110",
                        isFollowingLoading && "opacity-50 cursor-wait"
                      )}
                    >
                      {isFollowingLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      {isFollowingLoading 
                        ? '...' 
                        : isFollowing 
                          ? confirmFollow 
                            ? t('profile.confirmUnfollow') 
                            : t('profile.following') 
                          : t('profile.followJudge')}
        </button>
      )}
    </section>
  );
}
