import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AvatarEditModal } from './AvatarEditModal';

const mocks = vi.hoisted(() => ({
  postForm: vi.fn(),
  updateProfile: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('motion/react', () => ({
  motion: { div: 'div', img: 'img' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@api/client', () => ({ apiClient: { postForm: mocks.postForm } }));
vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { avatar: '/avatar.png' }, updateProfile: mocks.updateProfile }),
}));
vi.mock('@components/ui/Toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

describe('AvatarEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.postForm.mockResolvedValue({ url: '/new.png' });
    mocks.updateProfile.mockResolvedValue(undefined);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('rechaza archivos que no son imágenes y permite previsualizar el avatar', () => {
    const onClose = vi.fn();
    render(<AvatarEditModal onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('profile.chooseAvatar'), {
      target: { files: [new File(['text'], 'note.txt', { type: 'text/plain' })] },
    });
    expect(mocks.addToast).toHaveBeenCalledWith('error', 'profile.avatarError');
    fireEvent.click(screen.getByRole('button', { name: 'profile.viewFullAvatar' }));
    expect(screen.getAllByAltText('Avatar').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'profile.viewFullAvatar' }));
  });

  it('sube una imagen, actualiza el perfil y cierra el modal', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<AvatarEditModal onClose={onClose} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('profile.chooseAvatar'), {
      target: { files: [new File(['image'], 'avatar.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => {
      expect(mocks.postForm).toHaveBeenCalledWith('/upload/avatar', expect.any(FormData));
      expect(mocks.updateProfile).toHaveBeenCalledWith({ avatar: '/new.png' });
      expect(onSaved).toHaveBeenCalledWith('/new.png');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('muestra el error cuando falla la subida', async () => {
    mocks.postForm.mockRejectedValue(new Error('upload failed'));
    render(<AvatarEditModal onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('profile.chooseAvatar'), {
      target: { files: [new File(['image'], 'avatar.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith('error', 'upload failed'));
  });

  it('ignora el guardado sin archivo y revoca la previsualización anterior', () => {
    render(<AvatarEditModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('common.save'));
    const input = screen.getByLabelText('profile.chooseAvatar');
    const first = new File(['one'], 'one.png', { type: 'image/png' });
    const second = new File(['two'], 'two.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.change(input, { target: { files: [second] } });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('usa el mensaje traducido si la subida falla sin detalle', async () => {
    mocks.postForm.mockRejectedValue({});
    render(<AvatarEditModal onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('profile.chooseAvatar'), {
      target: { files: [new File(['image'], 'avatar.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith('error', 'profile.avatarError'));
  });
});
