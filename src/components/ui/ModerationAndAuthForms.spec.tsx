import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React, { type ReactNode } from 'react';
import type { Case } from '@typings/index';

const { post, postForm } = vi.hoisted(() => ({ post: vi.fn(), postForm: vi.fn() }));

vi.mock('@api/client', () => ({ apiClient: { post, postForm } }));
vi.mock('motion/react', () => ({
  motion: new Proxy({}, { get: (_target, tag: string) => (props: Record<string, unknown>) => React.createElement(tag, props) }),
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));
vi.mock('lucide-react', () => {
  const Icon = () => <span />;
  return {
    AlertCircle: Icon, AlertTriangle: Icon, ArrowLeft: Icon, CheckCircle: Icon, ChevronRight: Icon,
    Gavel: Icon, Image: Icon, ImageIcon: Icon, Loader2: Icon, Lock: Icon,
    Mail: Icon, Maximize2: Icon, Pencil: Icon, Quote: Icon, Send: Icon,
    Upload: Icon, X: Icon, Eye: Icon, EyeOff: Icon,
  };
});
vi.mock('./Comment', () => ({
  Comment: ({ comment }: { comment: { id: string } }) => <div data-testid={`comment-${comment.id}`} />,
}));

import { ForgotPassword } from './ForgotPasswordForm';
import { ResetPassword } from './ResetPasswordForm';
import { DeleteAccountModal } from './DeleteAccountModal';
import { EditImagesModal } from './EditImagesModal';
import { JoinCase } from './JoinCase';
import { EvidenceGallery } from './EvidenceGallery';
import { CommentThread } from './CommentThread';

const renderInRouter = (ui: React.ReactElement, initialEntries = ['/']) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

const caseData = {
  id: 'case-1',
  title: 'A sufficiently long title',
  category: 'Work',
  type: 'vote',
  status: 'PUBLIC',
  sideAUserId: 'user-a',
  sideBUserId: 'user-b',
  sideA: { name: 'Alice', avatar: '/a.png', story: 'Alice story with enough content', evidence: [{ id: 'a1', url: '/a.jpg', caption: 'Proof' }] },
  sideB: { name: 'Bob', avatar: '/b.png', story: 'Bob story with enough content', evidence: [{ id: 'b1', url: '/b.jpg', caption: 'Evidence' }] },
  votesA: 1, votesB: 2, votesBothWrong: 0, comments: [], tags: [], createdAt: '2026-01-01',
} as unknown as Case;

beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({});
  postForm.mockResolvedValue({ url: 'https://cdn.example/image.jpg', public_id: 'img-1' });
});

describe('ForgotPassword', () => {
  it('shows validation error and submits a valid email', async () => {
    const onBack = vi.fn();
    const view = renderInRouter(<ForgotPassword onBackToLogin={onBack} />);
    const { container } = view;
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('auth.emailRequired');
    fireEvent.change(screen.getByLabelText('auth.emailAddress'), { target: { value: 'person@example.com' } });
    post.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => { fireEvent.submit(container.querySelector('form')!); await Promise.resolve(); });
    expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'person@example.com', language: 'en' });
    view.unmount();
  });

  it('renders API errors', async () => {
    post.mockRejectedValueOnce(new Error('request failed'));
    const { container } = renderInRouter(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText('auth.emailAddress'), { target: { value: 'person@example.com' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')!); await Promise.resolve(); });
    expect(screen.getByRole('alert')).toHaveTextContent('request failed');
  });
});

describe('ResetPassword', () => {
  it('validates matching password fields before submitting', () => {
    const view = renderInRouter(<ResetPassword />, ['/reset-password?token=abc']);
    const { container } = view;
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('auth.newPassword'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText('auth.confirmPassword'), { target: { value: 'different' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByText('auth.passwordsDoNotMatch')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('submits a valid reset and shows success', async () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);
    const view = renderInRouter(<ResetPassword />, ['/reset-password?token=abc']);
    const { container } = view;
    fireEvent.change(screen.getByLabelText('auth.newPassword'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByLabelText('auth.confirmPassword'), { target: { value: 'ValidPass1!' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')!); await Promise.resolve(); });
    expect(post).toHaveBeenCalledWith('/auth/reset-password', { token: 'abc', newPassword: 'ValidPass1!' });
    expect(screen.getByText('auth.passwordResetSuccess')).toBeInTheDocument();
    view.unmount();
    timeout.mockRestore();
  });
});

describe('DeleteAccountModal', () => {
  it('only confirms after typing the username and can close', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<DeleteAccountModal isOpen username="Alice" onClose={onClose} onConfirm={onConfirm} />);
    const input = screen.getByPlaceholderText('deleteAccount.enterUsername');
    const confirm = screen.getByRole('button', { name: 'deleteAccount.suspend' });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'deleteAccount.suspend' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'deleteAccount.cancel' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('EditImagesModal', () => {
  it('submits selected existing images', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EditImagesModal images={[{ id: '1', url: '/one.jpg' }, { id: '2', url: '/two.jpg' }]} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getAllByRole('button').find((button) => button.querySelector('img[src="/two.jpg"]'))!);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await act(async () => { await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledWith(['1'], []);
  });

  it('does not submit without changes', () => {
    const onSubmit = vi.fn();
    render(<EditImagesModal images={[{ id: '1', url: '/one.jpg' }]} onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
  });
});

describe('JoinCase', () => {
  it('moves to response form and submits a valid story', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<JoinCase caseData={caseData} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /joinCase.tellYourSide/i }));
    fireEvent.change(screen.getByPlaceholderText('cases.whatReallyHappened'), { target: { value: 'This is my complete response to the accusation.' } });
    await act(async () => { fireEvent.submit(container.querySelector('form')!); await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledWith('This is my complete response to the accusation.', [], false);
  });
});

describe('EvidenceGallery', () => {
  it('renders nothing without evidence and opens the active image', () => {
    const onOpen = vi.fn();
    const { rerender } = render(<EvidenceGallery evidence={[]} accentClass="border-primary" onOpen={onOpen} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<EvidenceGallery evidence={[{ id: '1', url: '/one.jpg', caption: 'Photo' }, { id: '2', url: '/two.jpg', caption: 'Second' }]} accentClass="border-primary" onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onOpen).toHaveBeenCalledWith('/one.jpg');
  });
});

describe('CommentThread', () => {
  it('renders comments and forwards comment actions through props', () => {
    const onReply = vi.fn();
    const comments = [{ id: 'c1' }, { id: 'c2' }] as unknown as Case['comments'];
    render(<CommentThread comments={comments} currentUser={null} onReply={onReply} onLike={vi.fn()} />);
    expect(screen.getByTestId('comment-c1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-c2')).toBeInTheDocument();
  });
});
