import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Outlet, type Location } from 'react-router-dom';
import { Cpu, Users, Shield, BarChart, Settings, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@utils/helpers';
import { Tooltip } from '@shared/components/Tooltip';
import { motion, AnimatePresence } from 'motion/react';
import { AdminHeader } from './AdminHeader';
import { createPortal } from 'react-dom';

const ADMIN_NAV = [
  { id: 'motor-ia', icon: Cpu, labelKey: 'automation.title', path: '/admin/motor-ia' },
  { id: 'users', icon: Users, labelKey: 'admin.users', path: '/admin/users' },
  { id: 'moderation', icon: Shield, labelKey: 'admin.moderation', path: '/admin/moderation' },
  { id: 'analytics', icon: BarChart, labelKey: 'admin.analytics', path: '/admin/analytics' },
  { id: 'settings', icon: Settings, labelKey: 'admin.settings', path: '/admin/settings' },
] as const;

interface AdminLayoutContentProps {
  collapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
  location: Location;
}

export const AdminLayoutContent = ({ collapsed, onCollapseChange, location }: AdminLayoutContentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleCollapsed = () => onCollapseChange(!collapsed);

  const sidebarWidth = collapsed ? 'w-18' : 'w-72';

  // Desktop sidebar (no fixed, part of flex)
  const desktopSidebar = (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col bg-card border-r border-border-main/10 transition-all duration-200',
        sidebarWidth,
        'h-screen'
      )}
      aria-label={t('admin.sidebar.navigation')}
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
            'lg:flex ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-border-main/10',
            collapsed && 'rotate-180'
          )}
          aria-label={collapsed ? t('admin.sidebar.expand') : t('admin.sidebar.collapse')}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const label = t(item.labelKey);
          const buttonContent = (
            <button
              onClick={() => navigate(item.path)}
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
    </aside>
  );

  // Mobile drawer - rendered via portal to avoid z-index issues
  const mobileDrawer = mounted ? createPortal(
    <AnimatePresence>
      {mobileOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-60 lg:hidden w-72 bg-card border-r border-border-main/10 flex flex-col"
            role="dialog"
            aria-label={t('admin.sidebar.navigation')}
          >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border-main/10">
              <span className="text-lg font-black uppercase tracking-widest italic text-primary">
                {t('admin.sidebar.title')}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-border-main/10"
                aria-label={t('admin.sidebar.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-2">
              {ADMIN_NAV.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                const label = t(item.labelKey);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all group',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-muted hover:bg-border-main/5 hover:text-text-main'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110', active && 'text-primary')} />
                    <span className="text-sm font-black uppercase tracking-widest italic truncate">
                      {label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-border-main/10">
              <p className="text-xs text-text-muted text-center uppercase tracking-wider">
                {t('admin.sidebar.version')}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    , document.body) : null;

  // Mobile menu button
  const mobileMenuButton = (
    <button
      className="lg:hidden fixed top-16 left-4 z-50 w-9 h-9 rounded-lg bg-card border border-border-main/10 flex items-center justify-center text-text-main active:scale-95 transition-transform shadow-lg"
      onClick={() => setMobileOpen(true)}
      aria-label={t('admin.sidebar.open')}
    >
      <Menu className="w-5 h-5" />
    </button>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Desktop: flex row with sidebar + content */}
      <div className="hidden lg:flex h-full w-full">
        {desktopSidebar}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader titleKey={getTitleKey(location.pathname)} />
          <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile: stacked layout with drawer portal */}
      <div className="lg:hidden h-full flex flex-col">
        {mobileMenuButton}
        {mobileDrawer}
        <div className="flex-1 flex flex-col overflow-hidden pt-16">
          <AdminHeader titleKey={getTitleKey(location.pathname)} />
          <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

function getTitleKey(pathname: string): string | undefined {
  if (pathname === '/admin/motor-ia' || pathname.startsWith('/admin/motor-ia/')) {
    return 'automation.title';
  }
  if (pathname === '/admin/users' || pathname.startsWith('/admin/users/')) {
    return 'admin.users';
  }
  if (pathname === '/admin/moderation' || pathname.startsWith('/admin/moderation/')) {
    return 'admin.moderation';
  }
  if (pathname === '/admin/analytics' || pathname.startsWith('/admin/analytics/')) {
    return 'admin.analytics';
  }
  if (pathname === '/admin/settings' || pathname.startsWith('/admin/settings/')) {
    return 'admin.settings';
  }
  return undefined;
}