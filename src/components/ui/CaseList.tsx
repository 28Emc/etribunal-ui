import { memo } from 'react';
import { motion } from 'motion/react';
import type { Case } from '@typings/index';
import { CaseCard } from './CaseCard';
import { Loader2 } from 'lucide-react';
import { LoadingState, EmptyState } from '@shared/components/LoadingState';
import { CaseCardSkeleton } from '@shared/components/Skeleton';
import { useTranslation } from 'react-i18next';

interface CaseListProps {
  cases: Case[];
  currentUserId?: string;
  userVotes?: Record<string, 'A' | 'B' | 'BOTH_WRONG'>;
  onOpenDetail: (caseData: Case) => void;
  onViewProfile: (username: string) => void;
  onShare: (caseId: string) => void;
  onVote: (caseId: string, side: 'A' | 'B' | 'BothWrong') => Promise<void>;
  onToggleSave: (caseId: string) => Promise<void>;
  onReaction: (caseId: string, emoji: 'LIKE' | 'LOVE' | 'ANGRY') => Promise<void>;
  onAddComment: (caseId: string, text: string) => Promise<void>;
  isVoting: boolean;
  isSaving: boolean;
  isLoading: boolean;
  hasMore?: boolean;
  onOpenAuth?: () => void;
}

export const CaseList = memo(({
  cases,
  currentUserId,
  userVotes = {},
  onOpenDetail,
  onViewProfile,
  onShare,
  onVote,
  onToggleSave,
  onReaction,
  onAddComment,
  isVoting,
  isSaving,
  isLoading,
  hasMore,
  onOpenAuth,
}: CaseListProps) => {
  const { t } = useTranslation();

  if (isLoading && cases.length === 0) {
    return (
      <div className="space-y-5">
        <CaseCardSkeleton />
        <CaseCardSkeleton />
        <CaseCardSkeleton />
      </div>
    );
  }

  if (cases.length === 0) {
    return <EmptyState titleKey="profile.noCasesFound" />;
  }

  return (
    <>
      {cases.map((caseData) => (
        <motion.div
          key={caseData.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-5"
        >
          <CaseCard
            caseData={caseData}
            currentUserId={currentUserId}
            onOpenDetail={onOpenDetail}
            onViewProfile={onViewProfile}
            onShare={onShare}
            onVote={onVote}
            userVote={userVotes[caseData.id]}
            isSaved={caseData.isSaved}
            anchorsCount={caseData.anchorsCount}
            sharesCount={caseData.sharesCount}
            onToggleSave={onToggleSave}
            reactions={{ 
            LIKE: (caseData.reactions?.LIKE as number ?? 0) as number, 
            LOVE: (caseData.reactions?.LOVE as number ?? 0) as number, 
            ANGRY: (caseData.reactions?.ANGRY as number ?? 0) as number 
          }}
            userReaction={caseData.userReaction}
            onReaction={onReaction}
            onAddComment={onAddComment}
            commentsCount={caseData.comments?.length || 0}
            isVotingThis={isVoting}
            isSavingThis={isSaving}
            isReactingThis={false}
            onOpenAuth={onOpenAuth}
          />
        </motion.div>
      ))}
      {isLoading && cases.length > 0 && (
        <div className="w-full flex justify-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {!isLoading && hasMore === false && cases.length > 0 && (
        <div className="w-full flex justify-center py-8">
          <p className="text-[12px] text-text-muted tracking-widest">
            No hay más casos por mostrar
          </p>
        </div>
      )}
    </>
  );
}, (prev, next) => {
  if (prev.isLoading !== next.isLoading || prev.isVoting !== next.isVoting || prev.isSaving !== next.isSaving || prev.currentUserId !== next.currentUserId) {
    return false;
  }
  if (prev.cases === next.cases) {
    return true;
  }
  if (prev.cases.length !== next.cases.length) {
    return false;
  }
  for (let i = 0; i < prev.cases.length; i++) {
    const prevCase = prev.cases[i];
    const nextCase = next.cases[i];
    if (prevCase.id !== nextCase.id ||
        (prevCase.anchorsCount ?? 0) !== (nextCase.anchorsCount ?? 0) ||
        (prevCase.sharesCount ?? 0) !== (nextCase.sharesCount ?? 0) ||
        prevCase.isSaved !== nextCase.isSaved ||
        prevCase.votesA !== nextCase.votesA ||
        prevCase.votesB !== nextCase.votesB ||
        prevCase.votesBothWrong !== nextCase.votesBothWrong) {
      return false;
    }
  }
  return true;
});
