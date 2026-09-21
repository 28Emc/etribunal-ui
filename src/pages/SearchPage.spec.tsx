import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SearchPage } from './SearchPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: new URLSearchParams(),
  search: {
    query: '',
    setQuery: vi.fn(),
    search: vi.fn(),
    isSearching: false,
    results: { users: [], cases: [] },
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: { query?: string; count?: number }) => values?.query ? `${key}:${values.query}` : key }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useSearchParams: () => [mocks.params] }));
vi.mock('@hooks/useSearch', () => ({ useSearch: () => mocks.search }));
vi.mock('@utils/helpers', () => ({ cn: (...values: unknown[]) => values.filter(Boolean).join(' '), formatNumber: (n: number) => String(n), getCasePath: (c: { id: string }) => `/cases/${c.id}` }));
vi.mock('@services/anonymity', () => ({ getAnonymousAvatar: () => '/anonymous.png' }));

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = new URLSearchParams();
    mocks.search.query = '';
    mocks.search.isSearching = false;
    mocks.search.results = { users: [], cases: [] };
  });

  it('muestra el estado inicial sin consulta', () => {
    render(<SearchPage />);
    expect(screen.getByText('search.emptyState')).toBeInTheDocument();
  });

  it('muestra carga y resultados, y permite abrir caso o usuario', async () => {
    mocks.params = new URLSearchParams('q=ana');
    mocks.search.query = 'ana';
    mocks.search.isSearching = true;
    const { rerender } = render(<SearchPage />);
    expect(screen.getByText('search.searching')).toBeInTheDocument();
    mocks.search.isSearching = false;
    mocks.search.results = {
      users: [{ id: 'u1', username: 'ana', avatar_url: null, bio: 'Bio' }],
      cases: [{ id: 'c1', title: 'Caso', category: 'General', total_votes: 3, total_comments: 2, side_a_user: { id: 'u1', username: 'ana', avatar_url: null } }],
    } as any;
    rerender(<SearchPage />);
    fireEvent.click(screen.getByText('Caso'));
    fireEvent.click(screen.getAllByRole('button', { name: /@ana/ })[1]);
    expect(mocks.navigate).toHaveBeenCalledWith('/cases/c1');
    expect(mocks.navigate).toHaveBeenCalledWith('/users/ana');
    fireEvent.click(screen.getByText('search.cases'));
    expect(screen.getAllByRole('button', { name: /@ana/ })).toHaveLength(1);
    await waitFor(() => expect(mocks.search.search).toHaveBeenCalled());
  });

  it('muestra no resultados', () => {
    mocks.params = new URLSearchParams('q=zzz');
    mocks.search.query = 'zzz';
    render(<SearchPage />);
    expect(screen.getByText('search.noResultsFor:zzz')).toBeInTheDocument();
  });
});
