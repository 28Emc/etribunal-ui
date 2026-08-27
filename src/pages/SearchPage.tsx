import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, User as UserIcon, Gavel, Loader2 } from 'lucide-react';
import { useSearch, type CaseSearchResult } from '@hooks/useSearch';
import { cn, formatNumber, getCasePath } from '@utils/helpers';
import { getDisplayName, getAnonymousAvatar } from '@services/anonymity';

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';

  const search = useSearch({ minChars: 2, debounceMs: 300 });

  const [activeTab, setActiveTab] = useState<'ALL' | 'CASES' | 'USERS'>('ALL');
  const hasInitialized = useRef(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q && !hasInitialized.current) {
      hasInitialized.current = true;
      search.setQuery(q);
      const timer = setTimeout(() => search.search(), 50);
      return () => clearTimeout(timer);
    }
  }, [initialQuery, search]);

  const handleTabChange = (tab: 'ALL' | 'CASES' | 'USERS') => {
    setActiveTab(tab);
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
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                {tab === 'ALL' ? t('search.all') : tab === 'CASES' ? t('search.cases') : t('search.judges')}
                {tab !== 'ALL' && (
                  <span className="ml-2 text-xs opacity-70">
                    {tab === 'CASES' ? search.results.cases.length : search.results.users.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 md:px-4 py-4 md:py-6">
        {!initialQuery ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
            <p className="text-text-muted font-medium">
              {t('search.emptyState')}
            </p>
          </div>
        ) : search.isSearching ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-text-muted mt-4">{t('search.searching')}</p>
          </div>
        ) : filteredUsers.length === 0 && filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-muted font-medium">
              {t('search.noResultsFor', { query: search.query })}
            </p>
            <p className="text-text-muted text-sm mt-2">
              {t('search.noResultsHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCases.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                  <Gavel className="w-4 h-4" /> {t('search.casesCount', { count: filteredCases.length })}
                </div>
                {filteredCases.map((caseItem) => (
                  <button
                    key={caseItem.id}
                    onClick={() => handleCaseClick(caseItem)}
                    className="w-full text-left bg-card border border-border-main/10 rounded-[28px] p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {caseItem.images?.[0] && (
                        <img
                          src={caseItem.images[0].url}
                          alt={caseItem.title}
                          className="w-20 h-20 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-main truncate">{caseItem.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {caseItem.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-bold">{formatNumber(caseItem.total_votes || 0)}</span> {t('cases.votes')}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-bold">{formatNumber(caseItem.total_comments || 0)}</span> {t('cases.comments')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <img
                            src={caseItem.side_a_user?.avatar_url || getAnonymousAvatar(caseItem.side_a_user?.id)}
                            alt={caseItem.side_a_user?.username}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-xs text-text-muted">
                            @{caseItem.side_a_user?.username}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredUsers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                  <UserIcon className="w-4 h-4" /> {t('search.judgesCount', { count: filteredUsers.length })}
                </div>
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user.username)}
                    className="w-full text-left flex items-center gap-4 bg-card border border-border-main/10 rounded-xl p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <img
                      src={user.avatar_url || getAnonymousAvatar(user.id)}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-main">@{user.username}</p>
                      {user.bio && (
                        <p className="text-sm text-text-muted truncate">{user.bio}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
