import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JoinCasePage } from './JoinCasePage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), addToast: vi.fn(),
  query: { data: undefined as any, isLoading: false },
  respond: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: 'c1' }), useNavigate: () => mocks.navigate }));
vi.mock('@components/ui/Toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@layout/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@components/ui/JoinCase', () => ({ JoinCase: ({ onSubmit }: { onSubmit: (story: string, images: string[], anonymous: boolean) => Promise<void> }) => <button onClick={() => void onSubmit('defense', [], false).catch(() => undefined)}>submit response</button> }));
vi.mock('@redux/services/casesApi', () => ({ useGetCaseQuery: () => mocks.query, useRespondCaseMutation: () => [mocks.respond] }));

describe('JoinCasePage', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.query.data = undefined; mocks.query.isLoading = false; });
  it('muestra carga y caso inexistente', () => {
    mocks.query.isLoading = true; const { rerender } = render(<JoinCasePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    mocks.query.isLoading = false; rerender(<JoinCasePage />);
    expect(screen.getByText('cases.caseNotFound')).toBeInTheDocument();
  });
  it('envía una respuesta y vuelve al feed', async () => {
    mocks.query.data = { id: 'c1', inviteToken: 'invite-1' }; render(<JoinCasePage />);
    fireEvent.click(screen.getByText('submit response'));
    await waitFor(() => { expect(mocks.respond).toHaveBeenCalledWith(expect.objectContaining({ invite_token: 'invite-1', side_b_content: 'defense' })); expect(mocks.addToast).toHaveBeenCalledWith('success', 'toasts.responseSubmitted'); expect(mocks.navigate).toHaveBeenCalledWith('/'); });
  });
  it('notifica errores al responder', async () => {
    mocks.query.data = { id: 'c1', inviteToken: 'invite-1' };
    mocks.respond.mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ data: 'invalid invite' }) });
    render(<JoinCasePage />); fireEvent.click(screen.getByText('submit response'));
    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith('error', 'invalid invite'));
  });
});
