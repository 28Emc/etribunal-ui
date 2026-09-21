import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditCaseModal } from './EditCaseModal';
import type { Case } from '@typings/index';

const { postForm } = vi.hoisted(() => ({ postForm: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('motion/react', () => ({ motion: { div: 'div' } }));
vi.mock('@api/client', () => ({ apiClient: { postForm } }));

const caseData: Case = {
  id: 'case-1', title: 'A sufficiently long title', category: 'Relationship', type: 'vote', status: 'PUBLIC',
  sideAUserId: 'creator', sideBUserId: 'side-b',
  sideA: { name: 'Creator', avatar: '', story: 'A sufficiently long side A story', evidence: [{ id: 'image-a', url: 'https://example.test/a.jpg' }] },
  sideB: { name: 'Side B', avatar: '', story: 'A sufficiently long side B story', evidence: [{ id: 'image-b', url: 'https://example.test/b.jpg' }] },
  votesA: 0, votesB: 0, votesBothWrong: 0, comments: [], tags: [], createdAt: '',
};

describe('EditCaseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  });

  it('edits creator-owned fields, evidence selection and submits the normalized payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<EditCaseModal caseData={caseData} currentUserId="creator" onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByDisplayValue(caseData.title), { target: { value: '  Updated title  ' } });
    fireEvent.change(screen.getByDisplayValue(caseData.sideA.story), { target: { value: '  Updated creator story  ' } });
    fireEvent.click(screen.getByText('categories.work'));
    fireEvent.change(screen.getByPlaceholderText('cases.subtitlePlaceholderA'), { target: { value: '  Creator subtitle  ' } });
    fireEvent.change(screen.getByPlaceholderText('cases.subtitlePlaceholderBoth'), { target: { value: '  Neither  ' } });
    fireEvent.click(screen.getByRole('button', { name: /keepImages/i }));
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      title: 'Updated title', side_a_content: 'Updated creator story', category: 'Work',
      side_a_subtitle: 'Creator subtitle', both_wrong_subtitle: 'Neither', keepImageIds: [], newUrls: [],
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('edits the side B-only fields when the actor is the invited participant', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EditCaseModal caseData={caseData} currentUserId="side-b" onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByDisplayValue(caseData.sideB.story), { target: { value: ' Updated response ' } });
    fireEvent.change(screen.getByPlaceholderText('cases.subtitlePlaceholderB'), { target: { value: ' Response subtitle ' } });
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      side_b_content: 'Updated response', side_b_subtitle: 'Response subtitle', keepImageIds: ['image-b'], newUrls: [],
    }));
  });

  it('uploads new evidence before submitting and removes its preview', async () => {
    postForm.mockResolvedValue({ url: 'https://cdn.test/new.jpg', public_id: 'new' });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EditCaseModal caseData={{ ...caseData, sideA: { ...caseData.sideA, evidence: [] } }} currentUserId="creator" onClose={vi.fn()} onSubmit={onSubmit} />);

    const file = new File(['image'], 'evidence.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('moderator.addImages'), { target: { files: [file] } });
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(document.querySelector('.bg-red-500\\/80') as HTMLElement);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');

    fireEvent.change(screen.getByLabelText('moderator.addImages'), { target: { files: [file] } });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(postForm).toHaveBeenCalledWith('/upload/image', expect.any(FormData)));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ newUrls: ['https://cdn.test/new.jpg'] })));
  });

  it('keeps the modal open after a failed submission and blocks invalid content', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('failed'));
    render(<EditCaseModal caseData={caseData} currentUserId="creator" onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByText('common.save')).toBeEnabled();

    fireEvent.change(screen.getByDisplayValue(caseData.title), { target: { value: 'short' } });
    expect(screen.getByText('cases.titleMinLength')).toBeInTheDocument();
    expect(screen.getByText('common.save')).toBeDisabled();
  });
});
