import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteCaseModal } from './DeleteCaseModal';

const submit = vi.fn();
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('motion/react', () => ({ motion: { div: 'div' } }));

describe('DeleteCaseModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no envía un motivo vacío y permite cancelar', () => {
    const onClose = vi.fn();
    render(<DeleteCaseModal caseTitle="Caso" onClose={onClose} onSubmit={submit} />);
    fireEvent.click(screen.getByText('moderator.deleteSubmit'));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('moderator.deleteCase').closest('.fixed') as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('envía el motivo recortado y cierra al completar', async () => {
    submit.mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<DeleteCaseModal caseTitle="Caso" onClose={onClose} onSubmit={submit} />);
    fireEvent.change(screen.getByPlaceholderText('moderator.deletePlaceholder'), { target: { value: '  spam  ' } });
    fireEvent.click(screen.getByText('moderator.deleteSubmit'));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith('spam');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('mantiene abierto el modal si el envío falla', async () => {
    submit.mockRejectedValue(new Error('failed'));
    render(<DeleteCaseModal caseTitle="Caso" onClose={vi.fn()} onSubmit={submit} />);
    fireEvent.change(screen.getByPlaceholderText('moderator.deletePlaceholder'), { target: { value: 'reason' } });
    fireEvent.click(screen.getByText('moderator.deleteSubmit'));
    await waitFor(() => expect(submit).toHaveBeenCalledWith('reason'));
    expect(screen.getByPlaceholderText('moderator.deletePlaceholder')).toBeInTheDocument();
  });
});
