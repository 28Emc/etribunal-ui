import React from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@typings/index';
import { formatNumber } from '@utils/helpers';

interface ProfileStatsProps {
  user: User;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}

export function ProfileStats({ user, onFollowersClick, onFollowingClick }: ProfileStatsProps) {
  const { t } = useTranslation();

  return (
    <section className="grid grid-cols-3 gap-4" aria-label="Justice statistics">
      <div className="bg-card border border-border-main/10 rounded-[28px] p-5 text-center space-y-1 hover:border-primary/30 transition-colors">
        <span className="block text-xl font-black italic text-text-main">{formatNumber(user.casesCount || 0)}</span>
        <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest">{t('profile.cases')}</span>
      </div>
      <button 
        onClick={onFollowersClick}
        className="bg-card border border-border-main/10 rounded-[28px] p-5 text-center space-y-1 hover:border-primary/30 transition-colors"
      >
        <span className="block text-xl font-black italic text-text-main">{formatNumber(user.followersCount || 0)}</span>
        <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest">{t('profile.followers')}</span>
      </button>
      <button 
        onClick={onFollowingClick}
        className="bg-card border border-border-main/10 rounded-[28px] p-5 text-center space-y-1 hover:border-primary/30 transition-colors"
      >
        <span className="block text-xl font-black italic text-primary">
          {user.followingCount || 0}
        </span>
        <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest">{t('profile.following')}</span>
      </button>
    </section>
  );
}
