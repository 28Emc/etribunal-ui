import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, Users, Shield, BarChart, Settings, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@utils/helpers';
import { Tooltip } from '@shared/components/Tooltip';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_NAV = [
  { id: 'motor-ia', icon: Cpu, labelKey: 'automation.title', path: '/admin/motor-ia' },
  { id: 'users', icon: Users, labelKey: 'admin.users', path: '/admin/users' },
  { id: 'moderation', icon: Shield, labelKey: 'admin.moderation', path: '/admin/moderation' },
  { id: 'analytics', icon: BarChart, labelKey: 'admin.analytics', path: '/admin/analytics' },
  { id: 'settings', icon: Settings, labelKey: 'admin.settings', path: '/admin/settings' },
] as const;

const STORAGE_KEY = 'admin_sidebar_collapsed';

export const AdminSidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleCollapsed = () => setCollapsed(prev => !prev);

  return (
    <>
      <button
        className="lg:hidden fixed top-16 left-4 z-50 w-9 h-9 rounded-lg bg-card border border-border-main/10 flex items-center justify-center text-text-main active:scale-95 transition-transform"
        onClick={() => setMobileOpen(true)}
        aria-label={t('admin.sidebar.open')}
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: mobileOpen ? 0 : -300 }}
        animate={{ x: mobileOpen ? 0 : -300 }}
        exit={{ x: -300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-50 lg:z-40 flex flex-col bg-card border-r border-border-main/10 transition-all duration-200',
          collapsed ? 'w-18' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border-main/10">
          {!collapsed && (
            <span className="text-lg font-black uppercase tracking-widest italic text-primary">
              {t('admin.sidebar.title')}
            </span>
          )}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'lg:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-border-main/10',
              collapsed && 'rotate-180'
            )}
            aria-label={collapsed ? t('admin.sidebar.expand') : t('admin.sidebar.collapse')}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label={t('admin.sidebar.navigation')}>
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            const label = t(item.labelKey);
            const buttonContent = (
              <button
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all group',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-border-main/5 hover:text-text-main',
                  collapsed && 'justify-center'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110', active && 'text-primary')} />
                {!collapsed && (
                  <span className="text-sm font-black uppercase tracking-widest italic truncate">
                    {label}
                  </span>
                )}
              </button>
            );

            return collapsed ? (
              <Tooltip key={item.id} content={label} position="right">
                {buttonContent}
              </Tooltip>
            ) : (
              buttonContent
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-main/10">
          {!collapsed && (
            <p className="text-xs text-text-muted text-center uppercase tracking-wider">
              {t('admin.sidebar.version')}
            </p>
          )}
        </div>
      </motion.aside>
    </>
  );
};