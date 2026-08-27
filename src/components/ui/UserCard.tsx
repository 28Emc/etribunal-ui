import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, UserCheck, Loader2, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDisplayName, getAnonymousAvatar } from '@services/anonymity';
import { cn, formatNumber } from '@utils/helpers';

interface UserCardProps {
  id: string;
  username: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  followersCount: number;
  isFollowing: boolean;
  isLoading?: boolean;
  onFollow: (id: string, username: string) => Promise<void>;
  onClick?: (username: string) => void;
  showCrown?: boolean;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  id,
  username,
  avatarUrl,
  isAnonymous,
  followersCount,
  isFollowing,
  isLoading = false,
  onFollow,
  onClick,
  showCrown = false,
  className,
}) => {
  const { t } = useTranslation();

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onFollow(id, username);
  };

  const handleCardClick = () => {
    onClick?.(username);
  };

  return (
    <motion.div
      whileHover={{ x: 5 }}
      onClick={handleCardClick}
      className={cn(
        "p-3 bg-card border border-border-main/5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-2xl hover:bg-border-main/5 transition-all cursor-pointer flex items-center justify-between group",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={isAnonymous ? getAnonymousAvatar(id) : (avatarUrl || 'https://picsum.photos/seed/default/100/100')}
            className="w-10 h-10 rounded-full border border-border-main/20 object-cover"
            alt={username}
          />
          {showCrown && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-background flex items-center justify-center">
              <Crown className="w-2 h-2 text-white" />
            </span>
          )}
        </div>
        <div>
          <h4 className="font-black text-sm text-text-main group-hover:text-secondary transition-colors">
            {getDisplayName(username, isAnonymous, id)}
          </h4>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            {formatNumber(followersCount)} {t('profile.followers').toLowerCase()}
          </span>
        </div>
      </div>

      <button
        onClick={handleFollowClick}
        disabled={isLoading}
        className={cn(
          "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-1",
          isFollowing
            ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            : "bg-secondary/10 text-secondary hover:bg-secondary hover:text-white"
        )}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck className="w-3 h-3" />
            {t('profile.following')}
          </>
        ) : (
          <>
            <UserPlus className="w-3 h-3" />
            {t('profile.follow')}
          </>
        )}
      </button>
    </motion.div>
  );
};
