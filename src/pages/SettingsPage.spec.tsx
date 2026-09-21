import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

const { navigate, updateProfile, changePassword, logout, patch } = vi.hoisted(() => ({
  navigate: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), logout: vi.fn(), patch: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es', changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() },
  }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'u1', name: 'judge1', bio: 'A short bio', hasPassword: true,
      is_anonymous: false, language: 'es',
    },
    updateProfile, changePassword, logout,
  }),
}));
vi.mock('@api/client', () => ({ apiClient: { patch, delete: vi.fn() } }));
vi.mock('@utils/helpers', () => ({ cn: (...values: unknown[]) => values.filter(Boolean).join(' ') }));
vi.mock('@layout/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@components/ui/SectionTitle', () => ({ SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2> }));
vi.mock('@shared/components/SEO', () => ({ Seo: () => null }));
vi.mock('@components/ui/DeleteAccountModal', () => ({
  DeleteAccountModal: ({ onClose }: { onClose: () => void }) => <div role="dialog"><button onClick={onClose}>close delete</button></div>,
}));
vi.mock('motion/react', () => ({ motion: { div: 'div' }, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patch.mockResolvedValue({});
    changePassword.mockResolvedValue({});
    localStorage.clear();
  });

  it('permite editar el nombre y guarda el valor recortado', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('settings.editUsername'));
    const input = screen.getByPlaceholderText('settings.enterUsername');
    fireEvent.change(input, { target: { value: '  newname  ' } });
    fireEvent.click(screen.getByText('settings.saveNewIdentity'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: 'newname' }));
  });

  it('valida la longitud del nombre antes de llamar al contexto', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('settings.editUsername'));
    fireEvent.change(screen.getByPlaceholderText('settings.enterUsername'), { target: { value: 'abc' } });
    expect(screen.getByText('settings.saveNewIdentity')).toBeDisabled();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('actualiza bio y cambia preferencias de idioma, notificaciones y tema', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('settings.editBio'));
    fireEvent.change(screen.getByPlaceholderText('settings.tellWhoYouAre'), { target: { value: 'Updated bio' } });
    fireEvent.click(screen.getByText('settings.updateBio'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ bio: 'Updated bio' }));

    fireEvent.click(screen.getByText('settings.language'));
    fireEvent.click(screen.getByText('English'));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/profile/me', { language: 'en' }));

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(localStorage.getItem('etribunal_receive_notifications')).toBe('false');
    fireEvent.click(switches[1]);
    expect(localStorage.getItem('etribunal_theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('valida y cambia la contraseña', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('settings.changePassword'));
    fireEvent.change(screen.getByPlaceholderText('settings.currentPassword'), { target: { value: 'OldPass1!' } });
    fireEvent.change(screen.getByPlaceholderText('settings.newPassword'), { target: { value: 'NewPass1!' } });
    fireEvent.change(screen.getByPlaceholderText('settings.confirmNewPassword'), { target: { value: 'NewPass1!' } });
    fireEvent.click(screen.getByText('settings.saveNewPassword'));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('OldPass1!', 'NewPass1!'));
  });

  it('ejecuta logout y navegación, muestra soporte y abre/cierra borrado', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('settings.logOut'));
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
    fireEvent.click(screen.getByText('settings.contactSupport'));
    expect(screen.getByText('support@etribunal.app')).toBeInTheDocument();
    fireEvent.click(screen.getByText('settings.deleteAccount'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close delete'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
