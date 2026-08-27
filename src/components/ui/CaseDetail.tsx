import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Case, User, CaseComment } from '@typings/index';
import { cn, calculateVotePercentages } from '@utils/helpers';
import { X, MessageSquare, Scale, Trophy, Send, UserPlus, Image as ImageIcon, Reply, Link as LinkIcon, Copy, Check, Loader2, RefreshCw, Languages } from 'lucide-react';
import { useContentTranslation } from '@features/translation/hooks/useContentTranslation';
import { ENABLE_TRANSLATIONS } from '@services/featureFlags';
import { ConfirmModal } from '@shared/components/ConfirmModal';
import { Tooltip } from '@shared/components/Tooltip';
import { EvidenceGallery } from './EvidenceGallery';
import { CommentThread } from './CommentThread';

interface CaseDetailProps {
  caseData: Case | null;
  currentUser: User | null;
  onVote: (caseId: string, side: 'A' | 'B' | 'BothWrong') => void;
  onShare?: (caseId: string) => void;
  onClose: () => void;
  onAddComment: (caseId: string, text: string, parentId?: string) => void;
  onDeleteComment?: (caseId: string, commentId: string) => void;
  onRespondSideB: (story: string, images: string[]) => void;
  onRegenerateInviteLink: (caseId: string) => Promise<string | null>;
  onLikeComment: (caseId: string, commentId: string) => void;
  onReaction?: (caseId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY', targetType: 'CASE' | 'COMMENT', targetId: string) => Promise<void>;
  onToggleSave?: (caseId: string) => void;
  onUserClick?: (username: string) => void;
  isVoting?: boolean;
  isSaving?: boolean;
  isCommenting?: boolean;
  isReacting?: boolean;
  isDeleting?: boolean;
  reactions?: { LIKE: number; LOVE: number; ANGRY: number };
  userReaction?: string | null;
  onOpenAuth?: () => void;
  isModal?: boolean;
  visibleComments: CaseComment[];
  pendingComments: CaseComment[];
  pendingCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  isFetching: boolean;
  isPollingEnabled: boolean;
  fetchInitialComments: (caseId: string) => Promise<void>;
  fetchOlderComments: (caseId: string) => Promise<void>;
  checkForNewComments: (caseId: string) => Promise<number>;
  showNewComments: () => void;
  hideNewCommentsIndicator: () => void;
}

export const CaseDetail: React.FC<CaseDetailProps> = ({
  caseData,
  currentUser,
  onVote,
  onShare,
  onClose,
  onAddComment,
  onDeleteComment,
  onRespondSideB,
  onRegenerateInviteLink,
  onLikeComment,
  onReaction,
  onToggleSave,
  onUserClick,
  isVoting = false,
  isSaving = false,
  isCommenting = false,
  isReacting = false,
  isDeleting = false,
  reactions = { LIKE: 0, LOVE: 0, ANGRY: 0 },
  userReaction,
  onOpenAuth,
  isModal = true,
  visibleComments = [],
  pendingComments = [],
  pendingCount = 0,
  hasMore = true,
  nextCursor = null,
  isFetching = false,
  isPollingEnabled = true,
  fetchInitialComments,
  fetchOlderComments,
  checkForNewComments,
  showNewComments,
  hideNewCommentsIndicator
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseStory, setResponseStory] = useState('');
  const [responseImages, setResponseImages] = useState<string[]>([]);
  const [isRegeneratingInvite, setIsRegeneratingInvite] = useState(false);
  const [inviteLinkPreview, setInviteLinkPreview] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [justRepliedTo, setJustRepliedTo] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const commentInputRef = React.useRef<HTMLInputElement>(null);
  const commentsTopRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const {
    translateCase: translateCaseContent,
    showOriginal,
    showTranslated: showCaseTranslated,
    isTranslating: isCaseTranslating,
    translatedCase,
    showTranslation: showCaseTranslation,
    setTranslatedCase,
  } = useContentTranslation();

  const currentLocale = i18n.language?.split('-')[0] || 'es';
  const canTranslate = caseData?.contentLanguage && caseData.contentLanguage !== currentLocale;

  const isSideBWaiting = caseData?.status === 'WAITING' || caseData?.sideB?.name === "Waiting...";
  const isClassic = caseData?.type === 'classic';
  const isCurrentUserSideA = !!currentUser && !!caseData?.sideAUserId && currentUser.id === caseData.sideAUserId;
  const isCurrentUserSideB = !!currentUser && !!caseData?.sideBUserId && currentUser.id === caseData.sideBUserId;
  const canManageInvite = isCurrentUserSideA && isSideBWaiting;
  const isSaved = caseData?.isSaved || false;

  const { totalVotes, percentA, percentB, percentBoth, winner } = calculateVotePercentages(
    caseData?.votesA || 0,
    caseData?.votesB || 0,
    caseData?.votesBothWrong || 0,
  );

  useEffect(() => {
    if (pendingCount > 0 && commentsTopRef.current) {
      commentsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [pendingCount]);

  useEffect(() => {
    if (!commentsEndRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isFetching && visibleComments.length > 0 && caseData) {
          fetchOlderComments(caseData.id);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0,
      }
    );

    observer.observe(commentsEndRef.current);

    return () => {
      if (commentsEndRef.current) {
        observer.unobserve(commentsEndRef.current);
      }
    };
  }, [commentsEndRef.current, hasMore, isFetching, visibleComments.length, fetchOlderComments, caseData?.id]);

  const userVote = currentUser?.votes?.[caseData?.id || ''];
  const hasVoted = !!userVote;

  const canCastVote = !hasVoted && !isCurrentUserSideA && !isCurrentUserSideB;

  const handleVoteClick = (side: 'A' | 'B' | 'BothWrong') => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (isCurrentUserSideA || isCurrentUserSideB) return;
    if (!hasVoted && caseData) {
      onVote(caseData.id, side);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!commentText.trim() || !caseData) return;
    const parentId = replyingTo || undefined;
    if (parentId) setJustRepliedTo(parentId);
    await onAddComment(caseData.id, commentText, parentId);
    setCommentText('');
    setReplyingTo(null);
  };

  useEffect(() => {
    if (justRepliedTo) {
      const timer = setTimeout(() => setJustRepliedTo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [justRepliedTo]);

  const handleReactionClick = async (emoji: 'LIKE' | 'LOVE' | 'ANGRY', targetType: 'CASE' | 'COMMENT' = 'CASE', targetId?: string) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!onReaction || !caseData) return;
    try {
      await onReaction(caseData.id, emoji, targetType, targetId || caseData.id);
    } catch (err) {
      console.error('Error handling reaction', err);
    }
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (commentToDelete && onDeleteComment && caseData && caseData.id) {
      onDeleteComment(caseData.id, commentToDelete);
    }
    setShowDeleteConfirm(false);
    setCommentToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setCommentToDelete(null);
  };

  const handleRespond = () => {
    if (!responseStory.trim()) return;
    onRespondSideB(responseStory, responseImages);
    setShowResponseForm(false);
    setResponseStory('');
    setResponseImages([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setResponseImages(prev => [...prev, ...newImages]);
    }
    e.currentTarget.value = '';
  };

  const handleRegenerateInviteLink = async () => {
    if (!caseData) return;
    setIsRegeneratingInvite(true);
    try {
      const inviteLink = await onRegenerateInviteLink(caseData.id);
      if (inviteLink) {
        setInviteLinkPreview(inviteLink);
      }
    } finally {
      setIsRegeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLinkPreview) return;
    await navigator.clipboard.writeText(inviteLinkPreview);
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 2000);
  };

  if (!caseData || !caseData.sideA || !caseData.sideB) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {caseData && (
        <motion.div
          initial={{ y: isModal ? '100%' : 0, opacity: isModal ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: isModal ? '100%' : 0, opacity: isModal ? 1 : 0 }}
          className={cn(
            "bg-transparent flex flex-col",
            isModal
              ? "z-[100] fixed inset-0 lg:max-w-6xl lg:mx-auto"
              : "w-full"
          )}
        >
          {/* Scrollable Content */}
          <div className={cn(
            "flex-1 overflow-y-auto no-scrollbar p-2 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-10",
            !isClassic && "relative"
          )}>
            {/* Title */}
            <div className="space-y-4 text-center">
              <div className="flex justify-center flex-wrap gap-2">
                {caseData.tags?.map((tag, idx) => (
                  <span key={idx} className="text-[10px] font-black uppercase tracking-widest bg-border-main/5 text-text-muted px-3 py-1 rounded-full border border-border-main/10">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-3xl font-black leading-[0.9] tracking-tighter uppercase italic text-text-main">
                {showCaseTranslation && translatedCase ? translatedCase.title : caseData.title}
              </h2>
              {ENABLE_TRANSLATIONS && canTranslate && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {!showCaseTranslation ? (
                    <button
                      onClick={() => translateCaseContent(caseData.id, currentLocale)}
                      disabled={isCaseTranslating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all text-[11px] font-black uppercase tracking-widest text-primary disabled:opacity-50"
                    >
                      {isCaseTranslating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Languages className="w-3.5 h-3.5" />
                      )}
                      {t('cases.translate')}
                    </button>
                  ) : (
                    <button
                      onClick={showOriginal}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all text-[11px] font-black uppercase tracking-widest text-primary"
                    >
                      {t('cases.seeOriginal')}
                      <span className="text-[9px] font-medium text-text-muted normal-case tracking-normal">
                        ({translatedCase?.sourceLanguage?.toUpperCase()})
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Desktop VS — solo para vote, al nivel de avatars */}
            {!isClassic && (<div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 pointer-events-none z-50" style={{ top: '9rem' }}>
              <img src="/versus_color_nobg.png" alt="VS" className="w-40 h-40 object-contain drop-shadow-[0_0_20px_rgba(51,102,153,0.4)]" />
            </div>)}

            {/* Split Content — vote usa 2 columnas, classic es full-width */}
            <div className={cn(
              isClassic
                ? "space-y-6"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-16 lg:items-start"
            )}>

              {/* Side A Section */}
              <div className="space-y-4 md:space-y-6 lg:space-y-8">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-4 border-primary overflow-hidden shadow-[0_0_12px_rgba(51,102,153,0.15)]">
                    <img src={caseData.sideA?.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-lg md:text-xl lg:text-2xl leading-none italic uppercase tracking-tighter text-text-main">{caseData.sideA.name}</h4>
                      {isCurrentUserSideA && (
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">{t('cases.you')}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">{t('cases.sideA')}</span>
                  </div>
                </div>
                <div className="bg-card p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[32px] border border-border-main/5 text-base md:text-lg lg:text-xl font-medium text-text-main leading-snug">
                  "{showCaseTranslation && translatedCase ? translatedCase.sideA : caseData.sideA.story}"
                </div>
                {/* Swipeable Gallery A */}
                <EvidenceGallery
                  evidence={caseData.sideA.evidence}
                  accentClass="border-primary shadow-[0_0_0_1px_rgba(51,102,153,0.28)]"
                  onOpen={setFullscreenImage}
                />
              </div>

              {/* VS Divider (Mobile Only) — Solo para vote */}
              {!isClassic && (<div className="flex lg:hidden items-center gap-4 py-4 z-50">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border-main/20" />
                <img src="/versus_color_nobg.png" alt="VS" className="w-36 h-36 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(51,102,153,0.2)]" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border-main/20" />
              </div>)}

              {/* Side B Section — Solo en casos vote */}
              {!isClassic && (
                <div className="space-y-4 md:space-y-6 lg:space-y-8">
                  <div className="flex items-center justify-end md:justify-start md:flex-row-reverse gap-3 md:gap-4 text-right md:text-left">
                    <div className="md:text-right">
                      <div className="flex items-center gap-2 justify-end md:justify-start">
                        <h4 className="font-black text-lg md:text-xl lg:text-2xl leading-none italic uppercase tracking-tighter text-text-main">{caseData.sideB.name}</h4>
                        {isCurrentUserSideB && (
                          <span className="text-[10px] font-black text-secondary uppercase tracking-widest bg-secondary/10 px-2 py-1 rounded">{t('cases.you')}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-secondary uppercase tracking-widest">{t('cases.sideB')}</span>
                    </div>
                    <div className={cn("w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-4 overflow-hidden shadow-[0_0_12px_rgba(51,102,153,0.15)]", isSideBWaiting ? "border-primary" : "border-secondary shadow-[0_0_12px_rgba(255,102,0,0.15)]")}>
                      <img src={caseData.sideB.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>

                  {isSideBWaiting ? (
                    <div className="space-y-6">
                      <div className="bg-card/50 p-8 rounded-[32px] border border-dashed border-border-main/20 text-center space-y-6">
                        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                          <UserPlus className="w-8 h-8 text-secondary" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black italic uppercase tracking-tighter text-text-main">{t('cases.waitingForResponse')}</h4>
                          <p className="text-sm text-text-muted font-medium">
                            {caseData.sideBUserId && caseData.sideB.name !== 'Waiting...'
                              ? t('cases.stillNeedsToConfirm', { name: caseData.sideB.name })
                              : t('cases.otherSideHasntTold')}
                          </p>
                        </div>

                        {/* Botón de gestión de link: solo creador mientras WAITING */}
                        {canManageInvite ? (
                          <div className="grid grid-cols-1 gap-3">
                            <button
                              onClick={handleRegenerateInviteLink}
                              disabled={isRegeneratingInvite || !!inviteLinkPreview}
                              className={cn(
                                "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2",
                                inviteLinkPreview
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : "bg-secondary text-white hover:brightness-110"
                              )}
                            >
                              {isRegeneratingInvite ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : inviteLinkPreview ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  {t('cases.linkReady')}
                                </>
                              ) : (
                                <>
                                  <LinkIcon className="w-4 h-4" />
                                  {t('cases.viewInviteLink')}
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* El resto del público ve solo un badge pasivo */
                          <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-vote-bounce" />
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{t('cases.awaitingSideBDefense')}</span>
                          </div>
                        )}
                      </div>

                      {showResponseForm && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-card p-6 rounded-[32px] border border-secondary/30 space-y-4 shadow-xl"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-widest text-secondary">{t('cases.yourResponse')}</h4>
                            <Tooltip content={t('tooltips.close')}>
                              <button onClick={() => setShowResponseForm(false)}><X className="w-4 h-4" /></button>
                            </Tooltip>
                          </div>
                          <textarea
                            value={responseStory}
                            onChange={(e) => setResponseStory(e.target.value)}
                            placeholder={t('cases.tellYourSideResponse')}
                            className="w-full bg-border-main/5 border border-border-main/10 rounded-[28px] p-4 text-sm font-medium focus:outline-none focus:border-secondary transition-all min-h-[120px] resize-none"
                          />

                          {responseImages.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                              {responseImages.map((img, idx) => (
                                <div key={idx} className="relative min-w-[80px] h-20 rounded-xl overflow-hidden border border-border-main/10">
                                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <Tooltip content={t('tooltips.removeImage')}>
                                    <button
                                      onClick={() => setResponseImages(prev => prev.filter((_, i) => i !== idx))}
                                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  </Tooltip>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button className="flex-1 py-3 bg-secondary text-white rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={handleRespond}>
                              {t('cases.submitResponse')}
                            </button>
                            <Tooltip content={t('tooltips.addEvidence')}>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-12 h-12 bg-border-main/10 rounded-xl flex items-center justify-center hover:bg-border-main/20 transition-all"
                              >
                                <ImageIcon className="w-5 h-5 text-text-muted" />
                              </button>
                            </Tooltip>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              className="hidden"
                              multiple
                              accept="image/*"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="bg-card p-6 lg:p-8 rounded-[32px] border border-border-main/10 text-lg lg:text-xl font-medium text-text-main leading-snug text-right shadow-sm">
                        "{showCaseTranslation && translatedCase ? translatedCase.sideB : caseData.sideB.story}"
                      </div>
                      {/* Swipeable Gallery B */}
                      <EvidenceGallery
                        evidence={caseData.sideB.evidence}
                        accentClass="border-secondary shadow-[0_0_0_1px_rgba(255,102,0,0.28)]"
                        captionAlignClass="text-right"
                        onOpen={setFullscreenImage}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

{/* Voting Section — Solo en casos vote y cuando Side B ya respondió */}
            {!isClassic && !isSideBWaiting && (
              <div className="pt-6 space-y-6 lg:mx-auto">
                {!hasVoted && canCastVote ? (
                  <div className="space-y-3 md:space-y-4">
                    <h3 className="text-center text-xs font-black uppercase tracking-[0.3em] text-text-muted">{t('cases.castYourVerdict')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-2">
                      {/* Side A */}
                      <button 
                        onClick={() => handleVoteClick('A')}
                        disabled={isVoting || !canCastVote}
                        role="button"
                        aria-label={`Votar por ${caseData.sideA.name}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-2xl bg-primary/10 border border-primary/50 hover:bg-primary/20 active:bg-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_10px_rgba(51,102,153,0.25)]"
                      >
                        <div className="flex items-center justify-center w-10 shrink-0">
                          <Scale className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="text-left text-[10px] font-black text-primary/60 uppercase tracking-widest">{t('cases.vote')}</span>
                          <span className="text-left text-[16px] font-black text-primary uppercase tracking-widest truncate w-full italic">{caseData.sideA.name}</span>
                          <span className="text-left text-[10px] font-medium text-text-muted truncate w-full">{showCaseTranslation && translatedCase?.sideASubtitle ? translatedCase.sideASubtitle : (caseData.sideASubtitle || t('cases.sideA'))}</span>
                        </div>
                      </button>

                      {/* Both Wrong */}
                      <button 
                        onClick={() => handleVoteClick('BothWrong')}
                        disabled={isVoting || !canCastVote}
                        role="button"
                        aria-label="Votar porque ambos están equivocados"
                        className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-2xl bg-border-main/10 border border-border-main/90 hover:bg-border-main/20 active:bg-border-main/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.15)]"
                      >
                        <div className="flex items-center justify-center w-10 shrink-0">
                          <X className="w-8 h-8 text-text-muted" />
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="text-left text-[10px] font-black text-text-muted/60 uppercase tracking-widest">{t('cases.vote')}</span>
                          <span className="text-left text-[16px] font-black text-text-muted uppercase tracking-widest truncate w-full italic">{t('cases.bothWrongShort')}</span>
                          <span className="text-left text-[10px] font-medium text-text-muted truncate w-full">{showCaseTranslation && translatedCase?.bothWrongSubtitle ? translatedCase.bothWrongSubtitle : (caseData.bothWrongSubtitle || t('cases.bothWrongShort'))}</span>
                        </div>
                      </button>

                      {/* Side B */}
                      <button 
                        onClick={() => handleVoteClick('B')}
                        disabled={isVoting || !canCastVote}
                        role="button"
                        aria-label={`Votar por ${caseData.sideB.name}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 min-h-[44px] rounded-2xl bg-secondary/10 border border-secondary/50 hover:bg-secondary/20 active:bg-secondary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_10px_rgba(255,102,0,0.25)]"
                      >
                        <div className="flex items-center justify-center w-10 shrink-0">
                          <Scale className="w-8 h-8 text-secondary" />
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="text-left text-[10px] font-black text-secondary/60 uppercase tracking-widest">{t('cases.vote')}</span>
                          <span className="text-left text-[16px] font-black text-secondary uppercase tracking-widest truncate w-full italic">{caseData.sideB.name}</span>
                          <span className="text-left text-[10px] font-medium text-text-muted truncate w-full">{showCaseTranslation && translatedCase?.sideBSubtitle ? translatedCase.sideBSubtitle : (caseData.sideBSubtitle || t('cases.sideB'))}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-[40px] p-8 lg:p-12 border-2 border-primary/20 space-y-8 shadow-2xl"
                  >
                    {totalVotes > 0 && (
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-1.5 rounded-full border border-primary/30">
                          <Trophy className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t('cases.verdictReached')}</span>
                        </div>
                        <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter">
                          {winner === 'A' ? `${caseData.sideA.name} ${t('cases.wins')}` : winner === 'B' ? `${caseData.sideB.name} ${t('cases.wins')}` : t('cases.itsATie')}
                        </h3>
                      </div>
                    )}

                    <div className="space-y-8">
                      {/* Results Bar A */}
                      <div className={cn("space-y-3 transition-all", winner === 'A' && "scale-105")}>
                        <div className="flex justify-between items-end">
                          <span className={cn("text-sm lg:text-base font-black uppercase tracking-wider", winner === 'A' ? "text-primary" : "text-text-muted")}>
                            {caseData.sideA.name} {winner === 'A' && "👑"}
                          </span>
                          <span className="text-xl lg:text-2xl font-black italic text-text-main">{percentA}%</span>
                        </div>
                        <div className="h-5 lg:h-8 w-full bg-border-main/5 rounded-full overflow-hidden p-1 lg:p-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentA}%` }}
                            className="h-full rounded-full bg-primary shadow-[0_0_20px_rgba(51,102,153,0.6)]"
                          />
                        </div>
                      </div>

                      {/* Results Bar B */}
                      <div className={cn("space-y-3 transition-all", winner === 'B' && "scale-105")}>
                        <div className="flex justify-between items-end">
                          <span className={cn("text-sm lg:text-base font-black uppercase tracking-wider", winner === 'B' ? "text-secondary" : "text-text-muted")}>
                            {caseData.sideB.name} {winner === 'B' && "👑"}
                          </span>
                          <span className="text-xl lg:text-2xl font-black italic text-text-main">{percentB}%</span>
                        </div>
                        <div className="h-5 lg:h-8 w-full bg-border-main/5 rounded-full overflow-hidden p-1 lg:p-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentB}%` }}
                            className="h-full rounded-full bg-secondary shadow-[0_0_20px_rgba(255,102,0,0.6)]"
                          />
                        </div>
                      </div>

                      {/* Results Bar Both Wrong */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.bothWrongShort')}</span>
                          <span className="text-lg lg:text-xl font-black italic text-text-main">{percentBoth}%</span>
                        </div>
                        <div className="h-2 lg:h-3 w-full bg-border-main/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentBoth}%` }}
                            className="h-full bg-text-muted/40"
                          />
                        </div>
                      </div>
                    </div>

                    {userVote && (
                      <p className="text-center text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                        {t('cases.youVotedFor', {
                          name: userVote === 'BOTH_WRONG' ? t('cases.bothWrong') : userVote === 'A' ? caseData.sideA.name : caseData.sideB.name
                        })}
                      </p>
                    )}
                    {totalVotes === 0 && (
                      <p className="text-center text-sm font-medium text-text-muted mt-4">
                        {t('cases.noVotesYet')}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* Comment Input Section (Moved here) */}
            <div className="mt-8 lg:mt-12 mx-auto w-full">
              <div className="glass border border-border-main/10 rounded-[32px] overflow-hidden shadow-xl">
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 py-3 bg-secondary/10 flex items-center justify-between border-b border-secondary/20"
                  >
                    <div className="flex items-center gap-2">
                      <Reply className="w-4 h-4 text-secondary rotate-180" />
                      <span className="text-xs font-black uppercase tracking-widest text-secondary">
                        {caseData.comments.find(c => c.id === replyingTo)?.user === currentUser?.name
                          ? t('comments.replyingToYourself')
                          : t('comments.replyingTo')}
                      </span>
                      <span className="text-xs font-bold text-secondary">
                        @{caseData.comments.find(c => c.id === replyingTo)?.user}
                      </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-secondary hover:scale-110 transition-transform p-1 hover:bg-secondary/20 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                <div className="p-2 md:p-4 lg:p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={currentUser?.avatar || "https://picsum.photos/seed/user123/100/100"} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 relative">
                      <input
                        ref={commentInputRef}
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder={replyingTo ? t('comments.writeReply') : t('comments.dropVerdict')}
                        disabled={isCommenting}
                        className="w-full bg-border-main/5 border border-border-main/10 rounded-[28px] px-5 py-3 text-sm font-medium text-text-main focus:outline-none focus:border-primary transition-all pr-16 hover:bg-border-main/10 disabled:opacity-50"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={isCommenting || !commentText.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2 rounded-xl hover:scale-105 active:scale-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCommenting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
</div>

{/* Floating New Comments Button - appears below input when there are pending comments */}
              <AnimatePresence>
                {pendingCount > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={showNewComments}
                    className="mx-auto mt-4 flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all z-30"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-black uppercase tracking-widest">
                      +{pendingCount} {t('comments.new')}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Comments Section */}
              <div className="pt-10 lg:pt-16 space-y-6 mx-auto">
                <div className="flex items-center gap-2 px-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-text-main">
                    {isClassic ? t('cases.debateSection') : t('cases.verdictsSection')}
                  </h3>
                </div>

                <div className="space-y-6">
                  {(visibleComments.length + pendingComments.length) > 0 ? (
                    <>
                      {/* Scroll target for new comments */}
                      <div ref={commentsTopRef} />

                      {/* Render pending comments at the top (they're already in the right order) */}
                      <CommentThread
                        comments={pendingComments as CaseComment[]}
                        currentUser={currentUser}
                        highlightId={justRepliedTo}
                        onReply={(id) => {
                          if (!currentUser) {
                            if (onOpenAuth) onOpenAuth();
                            return;
                          }
                          setReplyingTo(id);
                          setTimeout(() => commentInputRef.current?.focus(), 100);
                        }}
                        onLike={(id) => {
                          if (!currentUser) {
                            if (onOpenAuth) onOpenAuth();
                            return;
                          }
                          onLikeComment(caseData.id, id);
                        }}
                        onDelete={onDeleteComment ? (commentId) => handleDeleteClick(commentId) : undefined}
                        onReaction={(cId, emoji) => handleReactionClick(emoji, 'COMMENT', cId)}
                        onUserClick={onUserClick}
                        isReacting={isReacting}
                        isDeleting={isDeleting}
                      />
                      {/* Render visible comments */}
                      <CommentThread
                        comments={visibleComments}
                        currentUser={currentUser}
                        highlightId={justRepliedTo}
                        onReply={(id) => {
                          if (!currentUser) {
                            if (onOpenAuth) onOpenAuth();
                            return;
                          }
                          setReplyingTo(id);
                          setTimeout(() => commentInputRef.current?.focus(), 100);
                        }}
                        onLike={(id) => {
                          if (!currentUser) {
                            if (onOpenAuth) onOpenAuth();
                            return;
                          }
                          onLikeComment(caseData.id, id);
                        }}
                        onDelete={onDeleteComment ? (commentId) => handleDeleteClick(commentId) : undefined}
                        onReaction={(cId, emoji) => handleReactionClick(emoji, 'COMMENT', cId)}
                        onUserClick={onUserClick}
                        isReacting={isReacting}
                        isDeleting={isDeleting}
                      />
                      {/* Infinite scroll trigger */}
                      <div ref={commentsEndRef} className="py-4 flex justify-center">
                        {isFetching && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('comments.loading')}</span>
                          </div>
                        )}
                        {!hasMore && visibleComments.length > 0 && (
                          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                            {t('comments.noMore')}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                   <div className="text-center py-12">
                     <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{t('comments.noComments')}</p>
                     <p className="text-[10px] font-semibold text-text-muted mt-2">{t('comments.beFirst')}</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {fullscreenImage && (
          <FullscreenViewer
            url={fullscreenImage}
            onClose={() => setFullscreenImage(null)}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inviteLinkPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/60 p-4 flex items-end lg:items-center justify-center"
            onClick={() => {
              setInviteLinkPreview(null);
              setCopiedInvite(false);
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-card border border-border-main/5 rounded-[36px] p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">{t('cases.inviteLinkReady')}</h4>
                  <p className="text-sm text-text-muted">
                    {caseData.sideBUserId && caseData.sideB.name !== 'Waiting...'
                      ? t('cases.onlyUserCanJoin', { name: caseData.sideB.name })
                      : t('cases.shareLinkForSideB')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setInviteLinkPreview(null);
                    setCopiedInvite(false);
                  }}
                  className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors"
                >
                  <X className="w-5 h-5 text-text-main" />
                </button>
              </div>

              <div className="bg-card border border-primary/10 rounded-[28px] p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <LinkIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{t('cases.reservedInvite')}</p>
                  <p className="text-sm font-semibold text-text-main truncate">{inviteLinkPreview}</p>
                </div>
                <button
                  onClick={handleCopyInviteLink}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 shrink-0",
                    copiedInvite
                      ? "bg-green-500/20 text-green-400"
                      : "bg-primary/10 hover:bg-primary/20 text-primary"
                  )}
                >
                  {copiedInvite ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>


            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('comments.deleteComment')}
        message={t('comments.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        variant="danger"
      />

    </>
  );
};

const FullscreenViewer = ({ url, onClose, t }: { url: string; onClose: () => void; t?: any }) => {
  const [scale, setScale] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      setScale(1);
    }
    setLastTap(now);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setInitialDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance !== null) {
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const newScale = Math.max(1, Math.min(5, (distance / initialDistance) * scale));
      setScale(newScale);
      setInitialDistance(distance);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center touch-none"
      onClick={onClose}
    >
      <div className="absolute top-6 right-6 z-[210]">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <motion.div
        drag={scale === 1 ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.y) > 100) onClose();
        }}
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.img
          src={url}
          alt={t?.('cases.evidence') || 'Evidence'}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          style={{ scale }}
          onMouseDown={handleDoubleTap}
          onTouchStart={(e) => {
            handleDoubleTap(e);
            handleTouchStart(e);
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setInitialDistance(null)}
          referrerPolicy="no-referrer"
          animate={{ scale }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        />
      </motion.div>
    </motion.div>
  );
};
