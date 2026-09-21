import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseList } from './CaseList';
import type { Case } from '@typings/index';

vi.mock('motion/react', () => ({ motion: { div: 'div' } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./CaseCard', () => ({
  CaseCard: ({ caseData, userVote, onOpenDetail }: { caseData: Case; userVote?: string; onOpenDetail: (c: Case) => void }) =>
    <button type="button" onClick={() => onOpenDetail(caseData)}>card:{caseData.id}:{userVote ?? 'none'}</button>,
}));
vi.mock('@shared/components/LoadingState', () => ({ EmptyState: ({ titleKey }: { titleKey: string }) => <div>{titleKey}</div> }));
vi.mock('@shared/components/Skeleton', () => ({ CaseCardSkeleton: () => <div data-testid="skeleton" /> }));

const caseData = { id: 'c1', title: 'Case', category: 'x', type: 'vote', status: 'PUBLIC',
  sideA: { name: 'A', avatar: '', story: '', evidence: [] }, sideB: { name: 'B', avatar: '', story: '', evidence: [] },
  votesA: 1, votesB: 2, votesBothWrong: 0, comments: [], tags: [], createdAt: '' } as Case;
const noop = vi.fn().mockResolvedValue(undefined);
const props = { cases: [caseData], onOpenDetail: vi.fn(), onViewProfile: vi.fn(), onShare: vi.fn(),
  onVote: noop, onToggleSave: noop, onReaction: noop, onAddComment: noop, isVoting: false, isSaving: false, isLoading: false };

describe('CaseList', () => {
  it('renders skeletons while initially loading', () => {
    render(<CaseList {...props} cases={[]} isLoading />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
  });
  it('renders empty state when there are no cases', () => {
    render(<CaseList {...props} cases={[]} />);
    expect(screen.getByText('profile.noCasesFound')).toBeInTheDocument();
  });
  it('passes the case vote to cards and reports detail selection', () => {
    render(<CaseList {...props} userVotes={{ c1: 'B' }} />);
    fireEvent.click(screen.getByText('card:c1:B'));
    expect(props.onOpenDetail).toHaveBeenCalledWith(caseData);
  });
  it('renders pagination loading and end markers', () => {
    const { rerender } = render(<CaseList {...props} isLoading />);
    expect(screen.getByText(/card:c1/)).toBeInTheDocument();
    rerender(<CaseList {...props} hasMore={false} />);
    expect(screen.getByText('No hay más casos por mostrar')).toBeInTheDocument();
  });
});
