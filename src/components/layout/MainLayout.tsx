import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Gavel, Search, Bell, User as UserIcon, Globe, ChevronDown, ChevronLeft, Check, Menu, X, Home, TrendingUp, Settings, Plus, Loader2, Sun, Moon, FileText, Shield, BookOpen, Info } from 'lucide-react';
import { apiClient, authStorage } from '@api/client';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { TrendingSidebar } from './TrendingSidebar';
import { useAuth } from '@context/AuthContext';
import { useNotifications } from '@features/cases/hooks/useNotifications';
import { useSearch } from '@shared/hooks/useSearch';
import { Tooltip } from '@shared/components/Tooltip';
import { Skeleton } from '@shared/components/Skeleton';
import { cn, getCasePath } from '@utils/helpers';
import { getAnonymousAvatar } from '@services/anonymity';
import { AnimatePresence, motion } from 'motion/react';

const NotificationsMenu = lazy(() => import('@features/users/components/NotificationsMenu').then(m => ({ default: m.NotificationsMenu })));
const Login = lazy(() => import('@features/auth/components/Login').then(m => ({ default: m.Login })));

interface MainLayoutProps {
  children?: React.ReactNode;
  activeTab?: 'for_you' | 'following' | 'trending' | 'top-judges';
}

export function MainLayout({ children, activeTab = 'for_you' }: MainLayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
    fetchNotifications,
    isLoading: isLoadingNotifications
  } = useNotifications();

  const search = useSearch({ minChars: 2, debounceMs: 750 });
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('etribunal_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [activeUsers, setActiveUsers] = useState<{ users: Array<{ id: string; username: string; avatar_url: string | null; is_anonymous: boolean }>; total: number } | null>(null);
  const [isLoadingActiveUsers, setIsLoadingActiveUsers] = useState(false);

  const fetchActiveUsers = async () => {
    setIsLoadingActiveUsers(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/cases/active-users`);
      const json = await response.json().catch(() => ({}));
      setActiveUsers(json.data ?? json);
    } catch (error) {
      console.error('Error fetching active users:', error);
    } finally {
      setIsLoadingActiveUsers(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('etribunal_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
    }
  }, [currentUser]);

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isSearchDropdownOpen && !target.closest('[data-search-container="true"]')) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSearchDropdownOpen]);

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
  };

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleToggleLanguage = () => {
    setShowLanguageMenu(!showLanguageMenu);
  };

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLanguageMenu(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    search.setQuery(value);
    if (value.trim().length >= 2) {
      setIsSearchDropdownOpen(true);
    } else if (value.trim().length === 0) {
      setIsSearchDropdownOpen(false);
      search.clearResults();
      navigate('/');
    } else {
      setIsSearchDropdownOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.query.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.query.trim())}`);
      setIsSearchDropdownOpen(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsSearchDropdownOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const handleUserResultClick = (username: string) => {
    navigate(`/users/${username}`);
    search.clearResults();
    setIsSearchDropdownOpen(false);
  };

  const handleSearchCaseClick = (caseItem: { id: string; title: string; side_a_user?: { username?: string } }) => {
    navigate(getCasePath({ id: caseItem.id, title: caseItem.title, sideA: { username: caseItem.side_a_user?.username } } as any));
    search.clearResults();
    setIsSearchDropdownOpen(false);
  };

  const { pathname } = useLocation();
  const feedTabs = ['/cases/following', '/cases/trending', '/cases/top-judges', '/cases', '/'];
  const isDetailOrCreate = (pathname.startsWith('/cases/') && !feedTabs.includes(pathname));

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden transition-colors duration-150", "bg-background text-text-main theme-transition")} data-layout="main">
      <nav className="fixed top-0 left-0 right-0 z-60 glass theme-transition">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between h-16 md:h-18 px-3 lg:px-0">
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden w-9 h-9 rounded-lg bg-card border border-border-main/10 flex items-center justify-center text-text-main active:scale-95 transition-transform">
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/">
              <img src="/icons/eTribunal-isotipo.png" alt="eTribunal" className="h-10 w-auto lg:hidden" />
              <img src="/icons/eTribunal-logo-horizontal.png" alt="eTribunal" className="hidden lg:block h-12 w-auto" />
            </Link>
          </div>

          <div className="hidden lg:flex items-center flex-1 px-4">
            <div className="relative w-full" data-search-container="true">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                <input ref={searchInputRef} type="text" placeholder={t('nav.searchPlaceholder')} value={search.query} onChange={handleSearchInputChange} onFocus={() => search.query.trim().length >= 2 && setIsSearchDropdownOpen(true)} onKeyDown={handleSearchKeyDown} className="w-full bg-card border border-border-main/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-all" autoComplete="off" />
              </div>

              {isSearchDropdownOpen && search.query.trim().length >= 2 && (
                <div className="absolute top-full mt-4 w-full bg-card border border-border-main/10 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {search.isSearching ? (
                    <div className="flex items-center justify-center h-20 w-full">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : (search.results.cases.length > 0 || search.results.users.length > 0) ? (
                    <>
                      {search.results.users.length > 0 && (
                        <div className="p-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-text-muted">
                            <UserIcon className="w-3 h-3" /> {t('cases.judges')}
                          </div>
                          {search.results.users.slice(0, 5).map((user) => (
                            <button key={user.id} onClick={() => handleUserResultClick(user.username)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left">
                              <img src={user.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`} alt="" className="w-8 h-8 rounded-full object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-main">@{user.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {search.results.cases.length > 0 && (
                        <div className={`p-2 ${search.results.users.length > 0 ? 'border-t border-border-main/10' : ''}`}>
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-text-muted">
                            <Gavel className="w-3 h-3" /> {t('cases.title')}
                          </div>
                          {search.results.cases.slice(0, 5).map((c) => (
                            <button key={c.id} onClick={() => handleSearchCaseClick(c)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left">
                              <div className="w-10 h-10 rounded-lg bg-border-main/10 flex items-center justify-center">
                                <Gavel className="w-4 h-4 text-text-muted" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-main truncate">{c.title}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <button onClick={() => { navigate(`/search?q=${encodeURIComponent(search.query.trim())}`); setIsSearchDropdownOpen(false); }} className="w-full p-3 text-center text-sm font-medium text-primary hover:bg-primary/5 border-t border-border-main/10">
                        {t('nav.searchSeeAll') || 'Ver todos los resultados'} →
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-10 w-full text-xs font-bold text-text-muted tracking-widest py-2">
                      {t('nav.searchNoResults')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 lg:gap-2 lg:hidden flex-1 mx-1 sm:mx-2">
            <button onClick={() => setShowMobileSearch(true)} className="w-full h-9 rounded-xl bg-card border border-border-main/10 flex items-center justify-center text-text-muted active:scale-95 transition-transform">
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 lg:gap-2">
            <Tooltip content={t('nav.toggleTheme')} position="bottom">
              <button onClick={handleToggleTheme} className="h-9 w-9 rounded-full bg-card border border-border-main/10 flex items-center justify-center text-text-main hover:bg-primary/10 transition-all">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </Tooltip>

            <div className="relative">
              <button onClick={handleToggleLanguage} className={cn("h-9 px-2 lg:px-3 rounded-full bg-card border border-border-main/10 flex items-center justify-center text-text-main hover:bg-primary/10 transition-all gap-1", showLanguageMenu && "bg-primary/10 border-primary/30")}>
                <Globe className="w-4 h-4" />
                <span className="hidden lg:block text-[10px] font-black uppercase">{i18n.language}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform hidden lg:block", showLanguageMenu && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showLanguageMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-2 w-40 bg-card border border-border-main/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2">
                      {[{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }].map((lang) => (
                        <button key={lang.code} onClick={() => handleLanguageSelect(lang.code)} className={cn("w-full px-4 py-2 text-left flex items-center justify-between hover:bg-primary/5 transition-colors", i18n.language === lang.code ? "text-primary font-black" : "text-text-main font-medium")}>
                          <span className="text-xs uppercase tracking-wider">{lang.label}</span>
                          {i18n.language === lang.code && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:flex items-center gap-1 lg:hidden">
              {isLoadingActiveUsers ? (
                <div className="flex items-center gap-1">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="w-10 h-3 rounded" />
                </div>
              ) : activeUsers && activeUsers.total > 0 ? (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {activeUsers.users.slice(0, 3).map((u) => (
                      <img
                        key={u.id}
                        className="w-6 h-6 rounded-full ring-2 ring-background object-cover"
                        src={u.is_anonymous ? getAnonymousAvatar(u.id) : (u.avatar_url || 'https://picsum.photos/seed/default/100/100')}
                        alt={u.username}
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-text-muted">{activeUsers.total}</span>
                </div>
              ) : null}
            </div>

            {currentUser ? (
              <>
                <div onClick={() => navigate(`/users/${currentUser.username}`)} className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-pointer overflow-hidden shadow-lg active:scale-95 transition-transform">
                  <img src={currentUser?.avatar || "https://picsum.photos/seed/user123/100/100"} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                <div className="relative">
                  <button onClick={handleOpenNotifications} className="w-9 h-9 rounded-lg bg-card border border-border-main/10 flex items-center justify-center text-text-muted hover:text-primary transition-colors relative active:scale-95">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-secondary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <Suspense fallback={null}>
                    <NotificationsMenu isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} isLoading={isLoadingNotifications} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} onSelectCase={(caseId) => navigate(`/cases/${caseId}`)} onSelectProfile={(username) => navigate(`/users/${username}`)} />
                  </Suspense>
                </div>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="h-9 px-4 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(51,102,153,0.2)]">
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('nav.signIn')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto relative overflow-hidden pt-16 md:pt-18">
        <div className="hidden lg:flex flex-col h-full overflow-x-hidden overflow-y-auto no-scrollbar">
          <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(tab === 'for_you' ? '/' : `/cases/${tab}`)} onProfileClick={() => currentUser ? navigate(`/users/${currentUser.username || currentUser.name}`) : navigate('/login')} onCreateClick={() => currentUser ? navigate('/create') : navigate('/login')} onSettingsClick={() => currentUser ? navigate('/settings') : navigate('/login')}           userAvatar={currentUser?.avatar ?? undefined} />
        </div>

        <div className={cn("flex-1 flex flex-col h-full relative mx-auto overflow-y-auto no-scrollbar transition-all duration-500 pt-4 md:pt-6 lg:pt-8 px-2 md:px-4")}>
          {children}
        </div>

        {!isDetailOrCreate && (
          <div className="hidden lg:flex flex-col h-full overflow-x-hidden overflow-y-auto no-scrollbar w-80 shrink-0">
            <TrendingSidebar onSelectCase={(caseId) => { 
              if (caseId === 'trending') { 
                navigate('/cases/trending'); 
              } else if (caseId === 'top-judges') { 
                navigate('/top-judges'); 
              } else if (caseId.startsWith('/cases/')) {
                navigate(caseId);
              } else {
                navigate(`/cases/${caseId}`); 
              } 
            }} onSelectProfile={(username) => navigate(`/users/${username}`)} onOpenTerms={() => navigate('/legal/terms')} onOpenPrivacy={() => navigate('/legal/privacy')} onOpenGuidelines={() => navigate('/legal/guidelines')} onOpenAbout={() => navigate('/legal/about')} onOpenAuth={() => navigate('/login')} />
          </div>
        )}
      </div>

      {!isDetailOrCreate && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => currentUser ? navigate('/create') : navigate('/login')} className="fixed right-4 bottom-4 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/40 active:scale-95 transition-transform lg:hidden">
          <Plus className="w-7 h-7" />
        </motion.button>
      )}

      <Suspense fallback={null}>
        {showAuthModal && <Login isModal={true} onClose={() => setShowAuthModal(false)} />}
      </Suspense>

      <AnimatePresence>
        {showSidebar && (
          <>
            <div className="fixed inset-0 z-[70] bg-black/60 lg:hidden" onClick={() => setShowSidebar(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed top-0 left-0 bottom-0 z-[80] w-80 bg-card border-r border-border-main/10 pt-4 lg:hidden overflow-y-auto">
              <div className="flex items-center justify-between px-4 pb-4 border-b border-border-main/10">
                <Link to="/" onClick={() => setShowSidebar(false)}>
                  <img src="/icons/eTribunal-logo-horizontal.png" alt="eTribunal" className="h-16 w-auto" />
                </Link>
                <button onClick={() => setShowSidebar(false)} className="w-9 h-9 rounded-lg bg-border-main/10 flex items-center justify-center text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {activeUsers && activeUsers.total > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-green-500">{t('sidebar.votingNow')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-3">
                        {activeUsers.users.slice(0, 4).map((u) => (
                          <img
                            key={u.id}
                            className="w-10 h-10 rounded-full ring-2 ring-card object-cover"
                            src={u.is_anonymous ? getAnonymousAvatar(u.id) : (u.avatar_url || 'https://picsum.photos/seed/default/100/100')}
                            alt={u.username}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                        {activeUsers.total > 4 && (
                          <div className="w-10 h-10 rounded-full ring-2 ring-card bg-border-main/50 flex items-center justify-center text-[10px] font-black text-text-muted">
                            +{activeUsers.total - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-text-muted">
                        {activeUsers.total} {t('sidebar.activeUsers')}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 px-4">{t('nav.feed')}</div>
                  <nav className="space-y-1 rounded-2xl">
                    <Link to="/" onClick={() => setShowSidebar(false)} className={cn("flex items-center gap-4 px-4 py-3 rounded-2xl transition-all", activeTab === 'for_you' ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-border-main/5 hover:text-text-main")}>
                      <Home className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('nav.feed')}</span>
                    </Link>
                    <Link to="/cases/following" onClick={() => setShowSidebar(false)} className={cn("flex items-center gap-4 px-4 py-3 rounded-2xl transition-all", activeTab === 'following' ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-border-main/5 hover:text-text-main")}>
                      <UserIcon className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('profile.following')}</span>
                    </Link>
                  </nav>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 px-4">{t('sidebar.discover')}</div>
                  <nav className="space-y-1 rounded-2xl">
                    <Link to="/cases/trending" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('sidebar.trending')}</span>
                    </Link>
                    <Link to="/top-judges" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                      <UserIcon className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('sidebar.topJudges')}</span>
                    </Link>
                  </nav>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 px-4">{t('layout.legal')}</div>
                  <nav className="space-y-1 rounded-2xl">
                    <Link to="/legal/terms" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('layout.terms')}</span>
                    </Link>
                    <Link to="/legal/privacy" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('layout.privacy')}</span>
                    </Link>
                    <Link to="/legal/guidelines" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                      <BookOpen className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('layout.guidelines')}</span>
                    </Link>
                    <Link to="/legal/about" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                      <Info className="w-5 h-5" />
                      <span className="text-sm font-black uppercase tracking-widest">{t('layout.about')}</span>
                    </Link>
                  </nav>
                </div>

                {currentUser ? (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 px-4">{t('layout.account')}</div>
                    <nav className="space-y-1 rounded-2xl">
                      <Link to="/settings" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all">
                        <Settings className="w-5 h-5" />
                        <span className="text-sm font-black uppercase tracking-widest">{t('layout.settings')}</span>
                      </Link>
                    </nav>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 px-4">{t('layout.account')}</div>
                    <nav className="space-y-1 rounded-2xl">
                      <Link to="/login" onClick={() => setShowSidebar(false)} className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all">
                        <UserIcon className="w-5 h-5" />
                        <span className="text-sm font-black uppercase tracking-widest">{t('nav.signIn')}</span>
                      </Link>
                    </nav>
                  </div>
                )}

                <div className="pt-6 border-t border-border-main/10">
                  <div className="text-center">
                    <span className="text-[10px] text-text-muted">© 2026 eTribunal</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileSearch && (
          <>
            <div className="fixed inset-0 z-[65] bg-black/60 lg:hidden" onClick={() => { setShowMobileSearch(false); search.clearResults(); setMobileSearchQuery(''); }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-background lg:hidden flex flex-col">
              <div className="p-4 pb-2 border-b border-border-main/10">
                <button onClick={() => { setShowMobileSearch(false); search.clearResults(); setMobileSearchQuery(''); }} className="w-9 h-9 rounded-lg bg-border-main/10 flex items-center justify-center text-text-muted">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 pt-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input type="text" placeholder={t('nav.searchPlaceholder')} value={mobileSearchQuery} onChange={(e) => { setMobileSearchQuery(e.target.value); search.setQuery(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter' && mobileSearchQuery.trim()) { navigate(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`); setShowMobileSearch(false); setMobileSearchQuery(''); search.clearResults(); } }} className="w-full bg-card border border-border-main/10 rounded-xl pl-12 pr-4 py-4 text-base text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-all" autoFocus />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {search.isSearching ? (
                  <div className="flex items-center justify-center h-32 w-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (search.results.cases.length > 0 || search.results.users.length > 0) ? (
                  <>
                    {search.results.users.length > 0 && (
                      <div className="p-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-text-muted">
                          <UserIcon className="w-3 h-3" /> {t('cases.judges')}
                        </div>
                        {search.results.users.slice(0, 5).map((user) => (
                          <button key={user.id} onClick={() => { navigate(`/users/${user.username}`); setShowMobileSearch(false); setMobileSearchQuery(''); search.clearResults(); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left">
                            <img src={user.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`} alt="" className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-medium text-text-main">@{user.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {search.results.cases.length > 0 && (
                      <div className={`p-2 ${search.results.users.length > 0 ? 'border-t border-border-main/10' : ''}`}>
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-text-muted">
                          <Gavel className="w-3 h-3" /> {t('cases.title')}
                        </div>
                        {search.results.cases.slice(0, 5).map((c) => (
                          <button key={c.id} onClick={() => { navigate(getCasePath({ id: c.id, title: c.title, sideA: { username: c.side_a_user?.username } } as any)); setShowMobileSearch(false); setMobileSearchQuery(''); search.clearResults(); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-left">
                            <div className="w-10 h-10 rounded-lg bg-border-main/10 flex items-center justify-center">
                              <Gavel className="w-4 h-4 text-text-muted" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-medium text-text-main truncate">{c.title}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <button onClick={() => { navigate(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`); setShowMobileSearch(false); setMobileSearchQuery(''); }} className="w-full p-4 text-center text-base font-medium text-primary hover:bg-primary/5 border-t border-border-main/10">
                      {t('nav.searchSeeAll') || 'Ver todos los resultados'} →
                    </button>
                  </>
                ) : mobileSearchQuery.trim().length >= 2 ? (
                  <div className="flex items-center justify-center h-20 w-full text-sm font-bold text-text-muted">
                    {t('nav.searchNoResults')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 w-full" />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
