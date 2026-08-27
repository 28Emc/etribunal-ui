import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Bell, MessageCircle, CheckCircle, Heart, UserPlus, BellOff } from 'lucide-react';
import { cn, formatRelativeCaseDate } from '@utils/helpers';

interface NotificationsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectCase: (caseId: string) => void;
  onSelectProfile: (username: string) => void;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ 
  isOpen, 
  onClose,
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectCase,
  onSelectProfile
}) => {
  const { t } = useTranslation();
  
  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'NEW_COMMENT': return t('notifications.newComment');
      case 'NEW_VOTE': return t('notifications.newVote');
      case 'NEW_REACTION': return t('notifications.newReaction');
      case 'CASE_JOINED': return t('notifications.caseJoined');
      case 'NEW_FOLLOWER': return t('notifications.newFollower');
      case 'CASE_INVITATION': return t('notifications.caseInvitation');
      default: return t('notifications.notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_COMMENT': return MessageCircle;
      case 'NEW_VOTE': return CheckCircle;
      case 'NEW_REACTION': return Heart;
      case 'CASE_JOINED': return UserPlus;
      case 'NEW_FOLLOWER': return UserPlus;
      case 'CASE_INVITATION': return UserPlus;
      default: return Bell;
    }
  };

  const getIconBgColor = (type: string) => {
    switch (type) {
      case 'NEW_COMMENT': return 'dark:text-secondary dark:bg-secondary/10 text-primary bg-primary/10';
      case 'NEW_VOTE': return 'dark:text-secondary dark:bg-secondary/10 text-primary bg-primary/10';
      case 'NEW_REACTION': return 'dark:text-secondary dark:bg-secondary/10 text-primary bg-primary/10';
      case 'NEW_FOLLOWER': return 'dark:text-secondary dark:bg-secondary/10 text-primary bg-primary/10';
      case 'CASE_JOINED': return 'dark:text-secondary dark:bg-secondary/10 text-primary bg-primary/10';
      case 'CASE_INVITATION': return 'dark:text-secondary dark:bg-secondary/10 text-primary bg-primary/10';
      default: return 'bg-border-main/10 text-text-muted';
    }
  };

  const getNotificationDescription = (n: any) => {
    const { type, payload, actor_username } = n;
    const actor = actor_username ? `@${actor_username}` : t('notifications.someone');
    const target = payload?.case_title ? `"${payload.case_title}"` : t('notifications.yourCase');
    
    switch (type) {
      case 'NEW_COMMENT':
        return payload?.is_reply 
          ? `${actor} ${t('notifications.repliedToComment')} ${target}`
          : `${actor} ${t('notifications.commentedOn')} ${target}`;
      case 'NEW_VOTE':
        return `${actor} ${t('notifications.votedOn')} ${target}`;
      case 'NEW_REACTION':
        return `${actor} ${t('notifications.reactedToYour')} ${payload?.targetType === 'COMMENT' ? t('notifications.comment') : t('notifications.caseWord')}`;
      case 'CASE_JOINED':
        return `${actor} ${t('notifications.joinedAsSideB')} ${target}`;
      case 'NEW_FOLLOWER':
        return `${actor} ${t('notifications.startedFollowing')}`;
      case 'CASE_INVITATION':
        return `${actor} ${t('notifications.invitedYou')} ${target}`;
      default:
        return `${actor} ${t('notifications.interactedWithYou')}`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border-main/10 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border-main/10 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-main">{t('notifications.title')}</h3>
              <button
                onClick={onMarkAllAsRead}
                className="text-xs dark:text-secondary text-primary hover:opacity-80 font-bold"
              >
                {t('notifications.markAllRead')}
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto no-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-border-main/5">
                  {notifications.map((n) => {
                    const Icon = getNotificationIcon(n.type);
                    return (
                    <button
                      key={n.id}
                      onClick={() => {
                        onMarkAsRead(n.id);
                        onClose();
                        
                        if (n.type === 'CASE_INVITATION' && n.payload?.invite_url) {
                          window.location.href = n.payload.invite_url;
                        } else if (n.payload?.case_id) {
                          onSelectCase(n.payload.case_id);
                        } else if (n.type === 'NEW_FOLLOWER' && n.actor_username) {
                          onSelectProfile(n.actor_username);
                        }
                      }}
                      className={cn(
                        "w-full p-4 flex items-start gap-4 dark:hover:bg-secondary/5 hover:bg-primary/5 transition-all text-left relative group",
                        !n.is_read && "dark:bg-secondary/[0.02] bg-primary/[0.02]"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden", getIconBgColor(n.type))}>
                        {n.actor_avatar ? (
                          <img src={n.actor_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-black text-text-main mb-0.5 leading-tight uppercase tracking-tight">
                          {getNotificationTitle(n.type)}
                        </p>
                        <p className="text-[11px] text-text-muted mb-1 line-clamp-2 leading-tight">
                          {getNotificationDescription(n)}
                        </p>
                        <p className="text-[9px] dark:text-secondary text-primary uppercase font-black tracking-widest mt-1">
                          {formatRelativeCaseDate(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full dark:bg-secondary bg-primary mt-2 ring-2 dark:ring-secondary/30 ring-primary/30" />
                      )}
                    </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-text-muted">
                  <BellOff className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">{t('notifications.noNotifications')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
