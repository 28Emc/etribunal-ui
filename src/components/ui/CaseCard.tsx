import React, { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'motion/react';
import type { Case } from '@typings/index';
import { cn, formatNumber, formatRelativeCaseDate, calculateVotePercentages } from '@utils/helpers';
import { MessageSquare, Share2, Scale, AlertCircle, Bookmark, BookmarkCheck, Loader2, Send, X } from 'lucide-react';
import { useToast } from '@shared/components/Toast';
import { ReactionBar } from '@shared/components/ReactionBar';
import { Tooltip } from '@shared/components/Tooltip';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@context/AuthContext';

interface CaseCardProps {
  caseData: Case;
  currentUserId?: string;
  onOpenDetail: (caseData: Case) => void;
  onViewProfile?: (username: string) => void;
  onShare?: (caseId: string) => void;
  userVote?: 'A' | 'B' | 'BOTH_WRONG' | null;
  onVote?: (caseId: string, side: 'A' | 'B' | 'BothWrong') => Promise<void>;
  isSaved?: boolean;
  isShared?: boolean;
  anchorsCount?: number;
  sharesCount?: number;
  onToggleSave?: (caseId: string) => Promise<void>;
  onToggleShare?: (caseId: string) => Promise<void>;
  reactions?: { LIKE: number; LOVE: number; ANGRY: number };
  userReaction?: string | null;
  onReaction?: (caseId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => Promise<void>;
  onAddComment?: (caseId: string, text: string, isAnonymous?: boolean) => Promise<void>;
  commentsCount?: number;
  isVotingThis?: boolean;
  isSavingThis?: boolean;
  isSharingThis?: boolean;
  isReactingThis?: boolean;
  onOpenAuth?: () => void;
}

const CaseCardComponent: React.FC<CaseCardProps> = ({
  caseData,
  currentUserId,
  onOpenDetail,
  onViewProfile,
  userVote,
  onVote,
  isSaved = false,
  isShared = false,
  anchorsCount = 0,
  sharesCount = 0,
  onToggleSave,
  onToggleShare,
  reactions = { LIKE: 0, LOVE: 0, ANGRY: 0 },
  userReaction,
  onReaction,
  onAddComment,
  commentsCount = 0,
  isVotingThis = false,
  isSavingThis = false,
  isSharingThis = false,
  isReactingThis = false,
  onShare,
  onOpenAuth,
}) => {
  const { currentUser } = useAuth();
  const globalAnon = currentUser?.is_anonymous ?? false;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(globalAnon);
  const { addToast } = useToast();
  const { t } = useTranslation();

  const isVoting = isVotingThis;
  const isSaving = isSavingThis;
  const isSharing = isSharingThis;
  const isReacting = isReactingThis;

  const commentsCountData = caseData.commentsCount || commentsCount || (caseData.comments?.length || 0);

  const currentAnchorsCount = anchorsCount ?? caseData.anchorsCount ?? 0;

  const sideAEvidence = caseData.sideA.evidence?.[0]?.url;
  const sideBEvidence = caseData.sideB.evidence?.[0]?.url;
  const sideAThumbnail = sideAEvidence || caseData.sideA.avatar;
  const sideBThumbnail = sideBEvidence || caseData.sideB.avatar;

  const hasNoEvidence = !sideAEvidence && !sideBEvidence;
  const hasOneSideEvidence = !!sideAEvidence !== !!sideBEvidence;

  const { totalVotes, percentA, percentB, percentBoth, winner } = calculateVotePercentages(
    caseData.votesA,
    caseData.votesB,
    caseData.votesBothWrong,
  );

  const canVote = caseData.status === 'PUBLIC' && caseData.type === 'vote' && caseData.sideB.name !== 'Waiting...';

  const isSideAOwner = currentUserId && caseData.sideAUserId === currentUserId;
  const isSideBOwner = currentUserId && caseData.sideBUserId === currentUserId;

  const handleVote = async (side: 'A' | 'B' | 'BothWrong') => {
    if (!canVote || isVoting) return;
    if (!currentUserId) {
      onOpenAuth?.();
      return;
    }
    try {
      await onVote?.(caseData.id, side);
      addToast('success', t('cases.votedStatus', { side: side === 'BothWrong' ? t('cases.bothWrong') : t('cases.side' + side) }));
    } catch (error) {
      addToast('error', t('errors.voteError'));
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentUserId) {
      onOpenAuth?.();
      return;
    }
    try {
      await onToggleSave?.(caseData.id);
    } catch (error) {
      addToast('error', t('errors.saveError'));
    }
  };

  const handleShare = () => {
    onShare?.(caseData.id);
  };

  const handleReaction = async (emoji: 'LIKE' | 'LOVE' | 'ANGRY') => {
    if (isReacting) return;
    if (!currentUserId) {
      onOpenAuth?.();
      return;
    }
    try {
      await onReaction?.(caseData.id, emoji);
    } catch (error) {
      addToast('error', t('errors.reactionError'));
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      await onAddComment?.(caseData.id, commentText, isAnonymous);
      setCommentText('');
      setShowComments(false);
    } catch (error) {
      addToast('error', t('errors.commentError'));
    } finally {
      setIsPostingComment(false);
    }
  };

  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showComments && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [showComments]);

  return (
    <motion.div
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="w-full max-w-full bg-card rounded-[32px] overflow-hidden border border-border-main/5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-2 md:mb-3 flex flex-col box-border"
    >
      <div className="p-3 md:p-4 pb-2 cursor-pointer" onClick={() => onOpenDetail(caseData)}>
        <div className="flex flex-wrap gap-2 mb-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            {caseData.type === 'classic' ? (
              <span className="text-[10px] font-black uppercase tracking-widest bg-secondary/10 text-secondary px-2 py-1 rounded-full border border-secondary/20">
                💬 {t('cases.debate')}
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                ⚖️ {t('cases.vote')}
              </span>
            )}
            {caseData.category && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-border-main/10 px-2 py-1 rounded-full border border-border-main/10 text-text-muted">
                {caseData.category}
              </span>
            )}
          </div>
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            {formatRelativeCaseDate(caseData.createdAt)}
          </span>
        </div>

        {caseData.moderation_status === 'FLAGGED' && (
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {t('moderator.statusFlagged')}
            </span>
          </div>
        )}

        <div className="flex items-center mb-4 min-h-[32px]">
          {caseData.type === 'vote' ? (
            <div className="flex items-center w-full">
              <div className="flex-1 flex items-center gap-2 cursor-pointer min-w-0" onClick={(e) => { e.stopPropagation(); !caseData.sideA.isAnonymous && onViewProfile?.(caseData.sideA.name); }}>
                <img
                  src={caseData.sideA.avatar}
                  alt=""
                  className="w-12 h-12 rounded-full border-2 border-primary/60 shadow-[0_0_8px_rgba(51,102,153,0.2)] shrink-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[10px] font-black text-text-main uppercase tracking-tight truncate">{caseData.sideA.name}</p>
              </div>
              <img src="/versus_color_nobg.png" alt="VS" className="w-24 h-24 object-contain shrink-0 z-10 relative drop-shadow-[0_0_6px_rgba(51,102,153,0.2)]" />
              <div className="flex-1 flex items-center gap-2 cursor-pointer justify-end min-w-0" onClick={(e) => { e.stopPropagation(); caseData.sideB.name !== 'Waiting...' && !caseData.sideB.isAnonymous && onViewProfile?.(caseData.sideB.name); }}>
                <p className={cn("text-[10px] font-black uppercase tracking-tight truncate", caseData.status === 'WAITING' ? "text-text-muted italic" : "text-text-main")}>
                  {caseData.status === 'WAITING' ? t('cases.awaitingSideB') : caseData.sideB.name}
                </p>
                <img
                  src={caseData.sideB.avatar || "https://i.pravatar.cc/150?u=waiting"}
                  alt=""
                  className={cn("w-12 h-12 rounded-full border-2 shadow-[0_0_8px_rgba(51,102,153,0.2)] shrink-0", caseData.sideBUserId ? "border-secondary/60 shadow-[0_0_8px_rgba(255,102,0,0.2)]" : "border-primary/60", caseData.status === 'WAITING' && "opacity-50 grayscale")}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); !caseData.sideA.isAnonymous && onViewProfile?.(caseData.sideA.name); }}>
              <img
                src={caseData.sideA.avatar}
                alt=""
                className="w-12 h-12 rounded-full border-2 border-primary/60 shadow-[0_0_8px_rgba(51,102,153,0.2)]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <p className="text-[10px] font-black text-text-main uppercase tracking-tight">{caseData.sideA.name}</p>
            </div>
          )}
        </div>

        <h2 className="text-sm md:text-base font-black uppercase leading-tight tracking-tight mb-1 text-text-main">
          {caseData.title}
        </h2>

        {caseData.sideA.story && (
          <p className="text-xs text-text-muted font-medium line-clamp-3">
            {caseData.sideA.story}
          </p>
        )}

        <div className="mt-3 rounded-2xl bg-primary/8 border border-primary/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[14px]">🗣️</span>
            </div>
            <span className="text-[10px] font-medium text-text-muted">
              {caseData.type === 'vote' ? (totalVotes > 0 ? t('caseCard.joinVoting') : t('caseCard.joinVotingEmpty')) : (commentsCountData > 0 ? t('caseCard.joinDebate') : t('caseCard.joinDebateEmpty'))}
            </span>
          </div>
          {(caseData.type === 'vote' ? totalVotes : commentsCountData) > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-primary border border-card flex items-center justify-center">
                <span className="text-[11px] font-bold text-white">
                  +{formatNumber(caseData.type === 'vote' ? totalVotes : commentsCountData)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!hasNoEvidence && (
        <div
          className="border-y border-border-main/10 overflow-hidden cursor-pointer relative h-[200px] md:h-[280px] lg:h-[320px]"
          onClick={() => onOpenDetail(caseData)}
        >
          {caseData.type === 'classic' ? (
            <div className="relative h-full">
              {sideAEvidence && (
                <>
                  <img src={sideAThumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </>
              )}
            </div>
          ) : hasOneSideEvidence ? (
            <div className="relative h-full">
              {sideAEvidence ? (
                <>
                  <img src={sideAThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                </>
              ) : (
                <>
                  <img src={sideBThumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 h-full">
              <div className="relative h-full">
                <img src={sideAThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
              </div>
              <div className="relative h-full">
                <img src={sideBThumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        {caseData.type !== 'classic' && caseData.sideB.name !== 'Waiting...' && (
          (!userVote && !isSideAOwner && !isSideBOwner) ? (
            canVote ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleVote('A'); }}
                  disabled={isVoting || !canVote}
                  role="button"
                  aria-label={`Votar por ${caseData.sideA.name}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-2xl bg-primary/10 border border-primary/50 hover:bg-primary/20 active:bg-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_10px_rgba(51,102,153,0.25)]"
                >
                  <div className="flex items-center justify-center w-10 shrink-0">
                    <Scale className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-left text-[10px] font-black text-primary/60 uppercase tracking-widest">{t('cases.vote')}</span>
                    <span className="text-left text-[16px] font-black text-primary uppercase tracking-widest truncate w-full italic">{t('cases.sideA')}</span>
                    <span className="text-left text-[10px] font-medium text-text-muted truncate w-full">
                      {caseData.sideASubtitle || t('cases.sideA')}
                    </span>
                  </div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleVote('BothWrong'); }}
                  disabled={isVoting || !canVote}
                  role="button"
                  aria-label="Votar porque ambos están equivocados"
                  className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-2xl bg-border-main/10 border border-border-main/90 hover:bg-border-main/20 active:bg-border-main/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.15)]"
                >
                  <div className="flex items-center justify-center w-10 shrink-0">
                    <X className="w-8 h-8 text-text-muted" />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-left text-[10px] font-black text-text-muted/60 uppercase tracking-widest">{t('cases.vote')}</span>
                    <span className="text-left text-[16px] font-black text-text-muted uppercase tracking-widest truncate w-full italic">
                      {t('cases.bothWrongShort')}
                    </span>
                    <span className="text-left text-[10px] font-medium text-text-muted truncate w-full">
                      {caseData.bothWrongSubtitle || t('cases.bothWrongShort')}
                    </span>
                  </div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleVote('B'); }}
                  disabled={isVoting || !canVote}
                  role="button"
                  aria-label={`Votar por ${caseData.sideB.name}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-2xl bg-secondary/10 border border-secondary/50 hover:bg-secondary/20 active:bg-secondary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_10px_rgba(255,102,0,0.25)]"
                >
                  <div className="flex items-center justify-center w-10 shrink-0">
                    <Scale className="w-8 h-8 text-secondary" />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-left text-[10px] font-black text-secondary/60 uppercase tracking-widest">{t('cases.vote')}</span>
                    <span className="text-left text-[16px] font-black text-secondary uppercase tracking-widest truncate w-full italic">
                      {t('cases.sideB')}
                    </span>
                    <span className="text-left text-[10px] font-medium text-text-muted truncate w-full">
                      {caseData.sideBSubtitle || t('cases.sideB')}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 rounded-[24px] bg-border-main/5 border border-border-main/10">
                <AlertCircle className="w-5 h-5 text-text-muted" />
                <span className="text-[10px] font-bold text-text-muted text-center uppercase tracking-wider">
                  {caseData.status === 'WAITING'
                    ? t('caseCard.awaitingSideBResponse')
                    : t('caseCard.votingClosed')}
                </span>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div>
                <div className="hidden sm:flex justify-between items-end">
                  <span className={cn("text-xs font-black uppercase tracking-tight flex-1 text-left truncate pr-2", winner === 'A' ? "text-primary" : "text-text-muted")}>
                    {percentA}% {caseData.sideA.name} {winner === 'A' && "👑"}
                  </span>
                  <span className="text-xs font-black uppercase tracking-tight text-text-muted flex-1 text-center shrink-0">
                    {percentBoth}% {t('cases.bothWrongShort')}
                  </span>
                  <span className={cn("text-xs font-black uppercase tracking-tight flex-1 text-right truncate pl-2", winner === 'B' ? "text-secondary" : "text-text-muted")}>
                    {winner === 'B' && "👑"} {caseData.sideB.name} {percentB}%
                  </span>
                </div>

                <div className="flex flex-col gap-1 sm:hidden">
                  <div className={cn("flex justify-between items-center text-[11px] font-black uppercase tracking-tight", winner === 'A' ? "text-primary" : "text-text-muted")}>
                    <span className="truncate pr-2">{caseData.sideA.name} {winner === 'A' && "👑"}</span>
                    <span className="shrink-0">{percentA}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tight text-text-muted">
                    <span className="truncate pr-2">{t('cases.bothWrongShort')}</span>
                    <span className="shrink-0">{percentBoth}%</span>
                  </div>
                  <div className={cn("flex justify-between items-center text-[11px] font-black uppercase tracking-tight", winner === 'B' ? "text-secondary" : "text-text-muted")}>
                    <span className="truncate pr-2">{caseData.sideB.name} {winner === 'B' && "👑"}</span>
                    <span className="shrink-0">{percentB}%</span>
                  </div>
                </div>
              </div>
              <div className="h-4 bg-border-main/5 rounded-full flex overflow-hidden p-0.5">
                <div style={{ width: `${percentA}%` }} className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(51,102,153,0.4)]" />
                <div style={{ width: `${percentBoth}%` }} className="h-full bg-text-muted/30" />
                <div style={{ width: `${percentB}%` }} className="h-full rounded-full bg-secondary shadow-[0_0_10px_rgba(255,102,0,0.4)]" />
              </div>
              {totalVotes > 0 && (
                <p className="text-center text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">
                  {t('cases.voted')} • {formatNumber(totalVotes)} {t('caseCard.jurors')}
                </p>
              )}
              {userVote && totalVotes > 0 && (
                <p className="text-center text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">
                  {t('cases.youVotedFor', {
                    name: userVote === 'BOTH_WRONG' ? t('cases.bothWrong') : userVote === 'A' ? caseData.sideA.name : caseData.sideB.name
                  })}
                </p>
              )}
              {totalVotes === 0 && (
                <p className="text-center text-xs font-medium text-text-muted mt-2">
                  {t('cases.noVotesYet')}
                </p>
              )}
            </div>
          )
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip content={t('comments.addComment')}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUserId) {
                    onOpenAuth?.();
                    return;
                  }
                  setShowComments(!showComments);
                }}
                className="p-2 rounded-full hover:bg-border-main/5 transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-5 h-5 text-text-muted" />
                {commentsCountData > 0 && (
                  <span className="text-[10px] font-black text-text-muted">{commentsCountData}</span>
                )}
              </button>
            </Tooltip>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <ReactionBar
                key={caseData.id}
                targetId={caseData.id}
                reactions={reactions}
                userReaction={userReaction}
                onReaction={handleReaction}
                isReacting={isReacting}
                size="sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content={isSaved ? t('tooltips.removeAnchor') : t('tooltips.anchorCase')}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "p-2.5 rounded-2xl transition-all duration-300 border flex items-center justify-center",
                    isSaved
                      ? "bg-primary border-primary text-white shadow-[0_8px_20px_rgba(51,102,153,0.4)] scale-110"
                      : "bg-border-main/5 border-border-main/10 text-text-muted hover:text-primary hover:border-primary/30",
                    isSaving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isSaved ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                      {currentAnchorsCount > 0 && (
                        <span className={
                          isSaved ?
                            "ml-1 text-[10px] font-black text-text-muted dark:text-white" :
                            "ml-1 text-[10px] font-black text-text-muted"
                        }>
                          {currentAnchorsCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </Tooltip>

            <Tooltip content={`${t('share.shareThis')}`}>
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-2xl transition-all duration-300 border bg-border-main/5 border-border-main/10 text-text-muted hover:text-primary hover:border-primary/30 flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5" />
                  {sharesCount > 0 && (
                    <span className="ml-1 text-[10px] font-black text-text-muted">
                      {sharesCount}
                    </span>
                  )}
                </button>
              </Tooltip>
          </div>
        </div>

        {showComments && (
          <>
          <div className="flex gap-2 items-center">
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('comments.writeComment')}
              className="flex-1 px-4 py-2 rounded-full border border-border-main/5 bg-card text-text-main text-sm font-medium focus:outline-none focus:border-primary/50"
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            {commentText.trim() && (
              <button
                onClick={() => { setShowComments(false); setCommentText(''); }}
                className="p-2.5 rounded-full border border-border-main/10 text-text-muted hover:bg-border-main/5"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleAddComment}
              disabled={isPostingComment || !commentText.trim()}
              className="p-2.5 rounded-full bg-primary text-white disabled:opacity-50"
            >
              {isPostingComment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-[10px] font-bold text-text-main leading-tight">{t('cases.publishAs')}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full border transition-all ${
                    !isAnonymous
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-text-muted/50 border-transparent"
                  }`}>{t('cases.userPublic')}</span>
                  <span className="text-[6px] text-text-muted/30">|</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full border transition-all ${
                    isAnonymous
                      ? "bg-secondary/10 text-secondary border-secondary/30"
                      : "text-text-muted/50 border-transparent"
                  }`}>{t('cases.anonymous')}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative w-9 h-5 rounded-full transition-all cursor-pointer shrink-0 ${
                  isAnonymous ? "bg-secondary" : "bg-text-muted/20"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-md ${
                  isAnonymous ? "left-[18px]" : "left-0.5"
                }`} />
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export const CaseCard = memo(CaseCardComponent, (prevProps, nextProps) => {
  const prevAnchors = prevProps.anchorsCount ?? prevProps.caseData.anchorsCount ?? 0;
  const nextAnchors = nextProps.anchorsCount ?? nextProps.caseData.anchorsCount ?? 0;
  return (
    prevProps.caseData.id === nextProps.caseData.id &&
    prevProps.caseData.votesA === nextProps.caseData.votesA &&
    prevProps.caseData.votesB === nextProps.caseData.votesB &&
    prevProps.caseData.votesBothWrong === nextProps.caseData.votesBothWrong &&
    prevProps.caseData.isSaved === nextProps.caseData.isSaved &&
    prevProps.caseData.anchorsCount === nextProps.caseData.anchorsCount &&
    prevAnchors === nextAnchors &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.userVote === nextProps.userVote &&
    prevProps.isVotingThis === nextProps.isVotingThis &&
    prevProps.isSavingThis === nextProps.isSavingThis
  );
});
