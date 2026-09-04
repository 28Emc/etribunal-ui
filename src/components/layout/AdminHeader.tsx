import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Globe, LogOut, User, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@utils/helpers';
import { useAuth } from '@context/AuthContext';
import { Tooltip } from '@shared/components/Tooltip';
import { motion, AnimatePresence } from 'motion/react';

interface AdminHeaderProps {
  titleKey?: string;
}

export const AdminHeader = ({ titleKey }: AdminHeaderProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('etribunal_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('etribunal_theme', newTheme);
  };

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLanguageMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const breadcrumbs = [
    { label: t('admin.header.admin'), href: '/admin' },
    ...(titleKey ? [{ label: t(titleKey), href: location.pathname }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 glass border-b border-border-main/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-2">
                {idx > 0 && <span className="text-text-muted">/</span>}
                {crumb.href && crumb.href !== location.pathname ? (
                  <Link to={crumb.href} className="text-text-muted hover:text-primary transition-colors font-medium">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-black text-text-main">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <Tooltip content={t('nav.toggleTheme')} position="bottom">
            <button
              onClick={handleToggleTheme}
              className="h-9 w-9 rounded-full bg-card border border-border-main/10 flex items-center justify-center text-text-main hover:bg-primary/10 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </Tooltip>

          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className={cn(
                'h-9 px-2 lg:px-3 rounded-full bg-card border border-border-main/10 flex items-center justify-center text-text-main hover:bg-primary/10 transition-all gap-1',
                showLanguageMenu && 'bg-primary/10 border-primary/30'
              )}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden lg:block text-[10px] font-black uppercase">{i18n.language}</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform hidden lg:block', showLanguageMenu && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-40 bg-card border border-border-main/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    {[{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={cn(
                          'w-full px-4 py-2 text-left flex items-center justify-between hover:bg-primary/5 transition-colors',
                          i18n.language === lang.code ? 'text-primary font-black' : 'text-text-main font-medium'
                        )}
                      >
                        <span className="text-xs uppercase tracking-wider">{lang.label}</span>
                        {i18n.language === lang.code && <span className="w-3 h-3 text-primary">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-pointer overflow-hidden shadow-lg active:scale-95 transition-transform"
            >
              <img
                src={currentUser?.avatar || `https://picsum.photos/seed/${currentUser?.id || 'user'}/100/100`}
                alt={currentUser?.username || 'Profile'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-card border border-border-main/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    <div className="px-4 py-3 border-b border-border-main/10">
                      <p className="text-sm font-black text-text-main truncate">@{currentUser?.username}</p>
                      <p className="text-xs text-text-muted truncate">{currentUser?.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate(`/users/${currentUser?.username}`); setShowUserMenu(false); }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-text-main hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('admin.userMenu.profile')}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-text-main hover:bg-primary/5 hover:text-secondary transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('admin.userMenu.logout')}</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};