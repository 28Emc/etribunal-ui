import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useLocation, type Location } from 'react-router-dom';
import { LoadingState } from '@components/ui/LoadingState';
import { useAuth } from '@context/AuthContext';
import { AUTOMATION_ADMIN_ROLES } from '@hooks/useAutomation';
import { AdminHeader } from './AdminHeader';
import { cn } from '@utils/helpers';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'admin_sidebar_collapsed';

const AdminLayoutContent = React.lazy(() => import('./AdminLayoutContent').then(m => ({ default: m.AdminLayoutContent })));

export const AdminLayout = () => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  if (isLoading) {
    return <LoadingState />;
  }

  const isAdmin = !!currentUser && AUTOMATION_ADMIN_ROLES.includes(currentUser.role);

  if (!isAdmin) {
    navigate('/', { replace: true, state: { from: location } });
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="admin-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn('h-screen flex flex-col overflow-hidden transition-colors duration-150', 'bg-background text-text-main theme-transition')}
      >
        <Suspense fallback={<LoadingState />}>
          <AdminLayoutContent collapsed={collapsed} onCollapseChange={setCollapsed} location={location as Location} />
        </Suspense>
      </motion.div>
    </AnimatePresence>
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