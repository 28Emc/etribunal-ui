import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { TFunction } from 'i18next';
import { cn } from '@utils/helpers';
import { useTranslation } from 'react-i18next';
import { RelativeTime } from '@shared/components/RelativeTime';
import { ReactionBar } from '@shared/components/ReactionBar';
import { Reply, Trash2, Loader2, Languages } from 'lucide-react';
import { useContentTranslation } from '@features/translation/hooks/useContentTranslation';
import { ENABLE_TRANSLATIONS } from '@services/featureFlags';

interface CommentItem {
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
}

interface CommentProps {
  comment: CommentItem;
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

function getAvatarSize(depth: number): string {
  if (depth === 0) return 'w-10 h-10';
  if (depth === 1) return 'w-9 h-9';
  return 'w-8 h-8';
}

function getIndents(depth: number): { soft: number; gap: number } {
  if (depth === 0) return { soft: 20, gap: 40 };
  if (depth === 1) return { soft: 18, gap: 36 };
  return { soft: 16, gap: 32 };
}

function commentHasReplies(comment: CommentItem): boolean {
  return (comment.replies?.length ?? 0) > 0 || (comment.replies_count ?? 0) > 0;
}

function CommentAvatar({ comment, size, onUserClick }: Readonly<{ comment: CommentItem; size: string; onUserClick?: (username: string) => void }>) {
  const base = cn(size, "rounded-full border-2 border-border-main/10 object-cover");
  return (
    <button type="button" onClick={() => onUserClick?.(comment.user)} className="block text-left">
      <div className="relative">
        {comment.avatar ? (
          <img src={comment.avatar} alt="" className={base} referrerPolicy="no-referrer" />
        ) : (
          <div className={cn(size, "rounded-full bg-primary/20 border-2 border-primary/10 flex items-center justify-center text-sm font-bold text-primary")}>
            {comment.user?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
    </button>
  );
}

interface CommentActionsProps {
  t: TFunction;
  comment: CommentItem;
  currentLocale: string;
  canReply: boolean;
  canShowReplies: boolean;
  hasReplies: boolean;
  showReplies: boolean;
  isDeleting: boolean;
  isCommentTranslating: boolean;
  showCommentTranslation: boolean;
  translatedComment: { commentId?: string; content?: string; sourceLanguage?: string } | null;
  onTranslate: () => void;
  onShowOriginal: () => void;
  onReplyClick: () => void;
  onDeleteClick?: () => void;
  onToggleReplies: () => void;
}

function CommentActions({
  t,
  comment,
  currentLocale,
  canReply,
  canShowReplies,
  hasReplies,
  showReplies,
  isDeleting,
  isCommentTranslating,
  showCommentTranslation,
  translatedComment,
  onTranslate,
  onShowOriginal,
  onReplyClick,
  onDeleteClick,
  onToggleReplies,
}: Readonly<CommentActionsProps>) {
  const canTranslate = comment.contentLanguage && comment.contentLanguage !== currentLocale;
  const translatedMatches = translatedComment?.commentId === comment.id;

  return (
    <div className="flex items-center gap-4 pt-1">
      {ENABLE_TRANSLATIONS && canTranslate && (
        <>
          {!showCommentTranslation || !translatedMatches ? (
            <button
              onClick={onTranslate}
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
              onClick={onShowOriginal}
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
          onClick={onReplyClick}
          className="cursor-pointer text-[9px] font-black text-text-muted hover:text-secondary hover:bg-secondary/5 px-2 py-1 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1"
        >
          <Reply className="w-3 h-3" />
          {t('comments.reply')}
        </button>
      )}
      {comment.isOwner && onDeleteClick && (
        <button
          onClick={onDeleteClick}
          disabled={isDeleting}
          className="text-[9px] font-black text-secondary hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          {t('comments.delete')}
        </button>
      )}
      {hasReplies && canShowReplies && (
        <button
          onClick={onToggleReplies}
          className="text-[10px] font-black text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="text-[8px]">↳</span>
          {showReplies ? t('comments.hideReplies') : `${t('comments.showReplies')} (${comment.replies?.length || comment.replies_count})`}
        </button>
      )}
    </div>
  );
}

export function Comment({
  comment,
  isTop: _isTop = false,
  highlightId,
  onReply,
  onLike,
  onDelete,
  onReaction,
  onShare: _onShare,
  onUserClick,
  isReacting = false,
  isDeleting = false,
  depth = 0,
}: Readonly<CommentProps>) {
  const { t, i18n } = useTranslation();
  const {
    translateComment: translateCommentContent,
    showOriginal,
    isTranslating: isCommentTranslating,
    translatedComment,
    showTranslation: showCommentTranslation,
    setTranslatedComment,
  } = useContentTranslation();
  // Inicializar con lazy initializer en lugar de useEffect + setState
  // Esto evita el render extra innecesario (react-hooks/set-state-in-effect)
  const [showReplies, setShowReplies] = useState(
    () => highlightId === comment.id && commentHasReplies(comment)
  );
  const [collapsed, setCollapsed] = useState(false);

  const currentLocale = i18n.language?.split('-')[0] || 'es';

  const reactions = comment.reactions || { LIKE: 0, LOVE: 0, ANGRY: 0 };
  const replies = comment.replies || [];
  const hasReplies = commentHasReplies(comment);
  const isHighlighted = highlightId === comment.id;

  const MAX_REPLY_DEPTH = 3;
  const MAX_SHOW_REPLIES_DEPTH = 2;

  const canReply = depth < MAX_REPLY_DEPTH - 1 && Boolean(onReply);
  const canShowReplies = depth < MAX_SHOW_REPLIES_DEPTH;

  const handleSubmitReply = () => {
    if (depth >= MAX_REPLY_DEPTH || !onReply) return;
    onReply(comment.id);
  };

  const avatarSize = getAvatarSize(depth);
  const indents = getIndents(depth);

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
            <CommentAvatar comment={comment} size={avatarSize} onUserClick={onUserClick} />
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
            
            <CommentActions
              t={t}
              comment={comment}
              currentLocale={currentLocale}
              canReply={canReply}
              canShowReplies={canShowReplies}
              hasReplies={hasReplies}
              showReplies={showReplies}
              isDeleting={isDeleting}
              isCommentTranslating={isCommentTranslating}
              showCommentTranslation={showCommentTranslation}
              translatedComment={translatedComment}
              onTranslate={() => translateCommentContent(comment.id, currentLocale)}
              onShowOriginal={() => {
                setTranslatedComment(null);
                showOriginal();
              }}
              onReplyClick={handleSubmitReply}
              onDeleteClick={onDelete ? () => onDelete(comment.id) : undefined}
              onToggleReplies={() => setShowReplies(!showReplies)}
            />
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
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                left: `${16 + indents.soft}px`,
                top: `${16 + indents.gap + 4}px`,
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
