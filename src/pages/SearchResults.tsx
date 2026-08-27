import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, User as UserIcon, Gavel, Loader2, ArrowLeft } from 'lucide-react';
import { SEO } from '@components/ui/SEO';
import { useSearch, type CaseSearchResult } from '@hooks/useSearch';
import type { Case } from '@typings/index';
import { cn, formatNumber, getCasePath } from '@utils/helpers';
import { getDisplayName, getAnonymousAvatar } from '@services/anonymity';
import { TopJudgesList } from '@layout/TopJudgesList';

interface SearchResultsProps {
  cases: CaseSearchResult[];
  users: { id: string; username: string; avatar_url: string | null; bio: string | null; followers_count?: number; is_following?: boolean }[];
  isLoading: boolean;
  onCaseClick: (caseItem: CaseSearchResult) => void;
  onUserClick: (username: string) => void;
  onUserFollow?: (userId: string, username: string) => void;
}

export function SearchResults({ cases, users, isLoading, onCaseClick, onUserClick, onUserFollow }: SearchResultsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20 w-full">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (cases.length === 0 && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 w-full text-xs font-bold text-text-muted tracking-widest py-2">
        {t('nav.searchNoResults')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title={t('search.search')} />
      {cases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-xs font-bold text-text-muted uppercase tracking-widest">
            <Gavel className="w-3 h-3" /> {t('cases.title')} ({cases.length})
          </div>
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              onClick={() => onCaseClick(caseItem)}
              className="p-4 bg-card border border-border-main/5 rounded-2xl cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-start gap-4">
                {caseItem.images?.[0] ? (
                  <img
                    src={caseItem.images[0].url}
                    alt={caseItem.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-border-main/10 flex items-center justify-center shrink-0">
                    <Gavel className="w-6 h-6 text-text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text-main text-sm line-clamp-2">{caseItem.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {caseItem.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span className="font-medium">{formatNumber(caseItem.total_votes)} {t('cases.votes').toLowerCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {users.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-xs font-bold text-text-muted uppercase tracking-widest">
            <UserIcon className="w-3 h-3" /> {t('profile.judges')} ({users.length})
          </div>
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => onUserClick(user.username)}
              className="p-3 bg-background border border-border-main/10 rounded-2xl cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar_url || getAnonymousAvatar(user.id)}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border border-border-main/20 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-text-main uppercase tracking-tight">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-text-muted truncate">{user.bio}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SearchPageContentProps {
  onBack?: () => void;
}

export function SearchPageContent({ onBack }: SearchPageContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const search = useSearch({ minChars: 2, debounceMs: 300 });
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'CASES' | 'USERS'>('ALL');
  const hasInitialSearch = React.useRef(false);
  
  useEffect(() => {
    if (initialQuery && !hasInitialSearch.current) {
      hasInitialSearch.current = true;
      search.setQuery(initialQuery);
      search.search();
    }
  }, [initialQuery, search]);
  
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (search.query.trim()) {
      setSearchParams({ q: search.query.trim() });
      search.search();
    }
  }, [search, setSearchParams]);
  
  const handleTabChange = (tab: 'ALL' | 'CASES' | 'USERS') => {
    setActiveTab(tab);
    search.setSearchType(tab);
  };

  const handleUserClick = (username: string) => {
    navigate(`/users/${username}`);
  };
  
  const handleCaseClick = (caseItem: CaseSearchResult) => {
    navigate(getCasePath({ id: caseItem.id, title: caseItem.title, sideA: { username: caseItem.side_a_user?.username } } as any));
  };
  
  const filteredUsers = activeTab === 'CASES' ? [] : search.results.users;
  const filteredCases = activeTab === 'USERS' ? [] : search.results.cases;
  
  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex gap-2">
          {(['ALL', 'CASES', 'USERS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                activeTab === tab
                  ? "bg-primary border-primary text-white"
                  : "bg-transparent border-border-main/10 text-text-muted hover:bg-border-main/5 hover:text-text-main"
              )}
            >
              {tab === 'ALL' ? t('nav.searchAll') : tab === 'CASES' ? t('nav.searchCasesTab') : t('nav.searchJudgesTab')}
            </button>
          ))}
        </div>
      </div>
      
      <SearchResults
        cases={filteredCases}
        users={filteredUsers}
        isLoading={search.isSearching}
        onCaseClick={handleCaseClick}
        onUserClick={handleUserClick}
      />
    </div>
  );
}
