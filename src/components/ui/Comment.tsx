import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@utils/helpers';
import { useTranslation } from 'react-i18next';
import { RelativeTime } from '@shared/components/RelativeTime';
import { ReactionBar } from '@shared/components/ReactionBar';
import { Reply, Trash2, Loader2, Languages } from 'lucide-react';
import { useContentTranslation } from '@features/translation/hooks/useContentTranslation';
import { ENABLE_TRANSLATIONS } from '@services/featureFlags';

interface CommentProps {
  comment: {
    id: string;
    user: string;
    userId?: string;
    avatar: string;
    text: string;
    timestamp: string;
    likes?: number;
    isOwner?: boolean;
    reactions?: { LIKE: number; LOVE: number; ANGRY: number };
    userReaction?: string | null;
    replies?: any[];
    replies_count?: number;
    contentLanguage?: string;
  };
  isTop?: boolean;
  highlightId?: string | null;
  onReply: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onReaction?: (commentId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => Promise<void>;
  onShare?: (commentId: string) => void;
  onUserClick?: (username: string) => void;
  isReacting?: boolean;
  isDeleting?: boolean;
  depth?: number;
}

export function Comment({
  comment,
  isTop = false,
  highlightId,
  onReply,
  onLike,
  onDelete,
  onReaction,
  onShare,
  onUserClick,
  isReacting = false,
  isDeleting = false,
  depth = 0,
}: CommentProps) {
  const { t, i18n } = useTranslation();
  const {
    translateComment: translateCommentContent,
    showOriginal,
    showTranslated: showCommentTranslated,
    isTranslating: isCommentTranslating,
    translatedComment,
    showTranslation: showCommentTranslation,
    setTranslatedComment,
  } = useContentTranslation();
  const [showReplies, setShowReplies] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const currentLocale = i18n.language?.split('-')[0] || 'es';
  const canTranslateComment = comment.contentLanguage && comment.contentLanguage !== currentLocale;

  const reactions = comment.reactions || { LIKE: 0, LOVE: 0, ANGRY: 0 };
  const replies = comment.replies || [];
  const hasReplies = (replies.length > 0) || (Boolean(comment.replies_count) && comment.replies_count! > 0);
  const isHighlighted = highlightId === comment.id;

  useEffect(() => {
    if (highlightId === comment.id && hasReplies) {
      setShowReplies(true);
    }
  }, [highlightId, comment.id, hasReplies]);

  const MAX_REPLY_DEPTH = 3;
  const MAX_SHOW_REPLIES_DEPTH = 2;

  const canReply = depth < MAX_REPLY_DEPTH - 1;
  const canShowReplies = depth < MAX_SHOW_REPLIES_DEPTH;

  const handleSubmitReply = () => {
    if (depth >= MAX_REPLY_DEPTH || !onReply) return;
    onReply(comment.id);
  };

  const avatarSize = depth === 0 ? 'w-10 h-10' : depth === 1 ? 'w-9 h-9' : 'w-8 h-8';

  const toggleCollapse = () => setCollapsed(c => !c);

  return (
    <div className={cn(
      "relative",
      depth > 0 && "ml-7"
    )}>



      {collapsed ? (
        <button
          onClick={toggleCollapse}
          className={cn(
            "flex items-center gap-2 py-1 w-full text-left",
            depth > 0 && "ml-7"
          )}
        >
          <span className="text-primary font-bold text-sm leading-none">[+]</span>
          <span className="text-xs font-semibold text-text-main hover:text-primary transition-colors">{comment.user}</span>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            backgroundColor: isHighlighted 
              ? ["rgba(255, 102, 0, 0.12)", "rgba(255, 102, 0, 0.04)", "rgba(255, 102, 0, 0.12)"] 
              : "transparent"
          }}
          transition={{ 
            backgroundColor: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 0.3, ease: "easeOut" },
            opacity: { duration: 0.2 }
          }}
          className="group relative flex gap-4 p-4 rounded-[24px] transition-all hover:bg-border-main/5"
        >
          <div className="shrink-0">
            <button type="button" onClick={() => onUserClick?.(comment.user)} className="block text-left">
              <div className="relative">
                {comment.avatar ? (
                  <img
                    src={comment.avatar}
                    alt=""
                    className={cn(avatarSize, "rounded-full object-cover border-2 border-border-main/10")}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={cn(avatarSize, "rounded-full bg-primary/20 border-2 border-primary/10 flex items-center justify-center text-sm font-bold text-primary")}>
                    {comment.user?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </button>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex sm:flex-row flex-col sm:items-center items-start sm:gap-2 gap-1">
                <button onClick={() => onUserClick?.(comment.user)} className="text-xs font-black text-text-main uppercase tracking-wider hover:text-primary transition-colors">{comment.user}</button>
                {comment.isOwner && (
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded">{t('cases.you')}</span>
                )}
                <RelativeTime value={comment.timestamp} className="text-[8px] text-text-muted font-bold uppercase tracking-widest" />
              </div>
              {onReaction && (
                <ReactionBar 
                  targetId={comment.id}
                  reactions={reactions}
                  userReaction={comment.userReaction}
                  onReaction={(emoji) => onReaction(comment.id, emoji)}
                  isReacting={isReacting}
                  size="sm"
                />
              )}
            </div>

            <p className={cn(
              "leading-relaxed",
              "text-sm text-text-muted font-medium"
            )}>
              {showCommentTranslation && translatedComment?.commentId === comment.id ? translatedComment.content : comment.text}
            </p>
            
            <div className="flex items-center gap-4 pt-1">
              {ENABLE_TRANSLATIONS && canTranslateComment && (
                <>
                  {!showCommentTranslation || translatedComment?.commentId !== comment.id ? (
                    <button
                      onClick={() => translateCommentContent(comment.id, currentLocale)}
                      disabled={isCommentTranslating}
                      className="text-[9px] font-black text-text-muted hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
                    >
                      {isCommentTranslating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Languages className="w-3 h-3" />
                      )}
                      {t('cases.translate')}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setTranslatedComment(null);
                        showOriginal();
                      }}
                      className="text-[9px] font-black text-primary hover:text-primary/80 px-2 py-1 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1"
                    >
                      {t('cases.seeOriginal')}
                      <span className="text-[7px] font-medium text-text-muted normal-case tracking-normal">
                        ({translatedComment?.sourceLanguage?.toUpperCase()})
                      </span>
                    </button>
                  )}
                </>
              )}
              {canReply && (
                <button
                  onClick={handleSubmitReply}
                  className="cursor-pointer text-[9px] font-black text-text-muted hover:text-secondary hover:bg-secondary/5 px-2 py-1 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" />
                  {t('comments.reply')}
                </button>
              )}
              {comment.isOwner && onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  disabled={isDeleting}
                  className="text-[9px] font-black text-secondary hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {t('comments.delete')}
                </button>
              )}
              {hasReplies && canShowReplies && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="text-[10px] font-black text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="text-[8px]">↳</span>
                  {showReplies ? t('comments.hideReplies') : `${t('comments.showReplies')} (${replies.length || comment.replies_count})`}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showReplies && hasReplies && !collapsed && (
          <motion.div
            key="replies-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Connector line: desde el centro inferior del avatar hasta el final de los hijos */}
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                left: `${16 + (depth === 0 ? 20 : depth === 1 ? 18 : 16)}px`,
                top: `${16 + (depth === 0 ? 40 : depth === 1 ? 36 : 32) + 4}px`,
                bottom: 0,
                transformOrigin: 'top',
              }}
              className="absolute w-[2px] bg-border-main/60 pointer-events-none"
            />
            <div className="space-y-0 mt-2">
              {replies.map((reply: any, idx: number) => (
                <Comment
                  key={reply.id || `reply-${idx}`}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  onReaction={onReaction}
                  isReacting={isReacting}
                  isDeleting={isDeleting}
                  depth={(depth || 0) + 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
