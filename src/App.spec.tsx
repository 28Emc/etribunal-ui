import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const post = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('react-redux', () => ({ Provider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('react-router-dom', () => ({ BrowserRouter: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('react-helmet-async', () => ({ HelmetProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@components/ui/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@components/ui/Toast', () => ({ ToastProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@context/AuthContext', () => ({ AuthProvider: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@routing/index', () => ({ AppRoutes: () => <div>routes</div> }));
vi.mock('@redux/store', () => ({ store: {} }));
vi.mock('@api/client', () => ({ apiClient: { post } }));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('renders the application providers and routes', () => {
    const { getByText } = render(<App />);
    expect(getByText('routes')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('tracks shared case links and removes tracking parameters', () => {
    window.history.replaceState({}, '', '/cases/case-7?utm_source=share&utm_medium=whatsapp&foo=bar');
    render(<App />);

    expect(post).toHaveBeenCalledWith('/cases/case-7/track-share');
    expect(window.location.pathname).toBe('/cases/case-7');
    expect(window.location.search).toBe('?foo=bar');
  });

  it('tracks shared user links and ignores unsupported share URLs', () => {
    window.history.replaceState({}, '', '/users/judge-7?utm_source=share');
    render(<App />);
    expect(post).toHaveBeenCalledWith('/users/judge-7/track-share');

    post.mockClear();
    window.history.replaceState({}, '', '/settings?utm_source=share');
    render(<App />);
    expect(post).not.toHaveBeenCalled();
  });

  it('does not fail when share tracking rejects', async () => {
    post.mockRejectedValueOnce(new Error('offline'));
    window.history.replaceState({}, '', '/cases/case-8?utm_source=share');
    expect(() => render(<App />)).not.toThrow();
    await Promise.resolve();
  });
});
