import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LoadingState } from '@components/ui/LoadingState';
import { useAuth } from '@context/AuthContext';
import { AUTOMATION_ADMIN_ROLES } from '@hooks/useAutomation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { cn } from '@utils/helpers';

const STORAGE_KEY = 'admin_sidebar_collapsed';

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
    <div className={cn('h-screen flex flex-col overflow-hidden transition-colors duration-150', 'bg-background text-text-main theme-transition')}>
      <AdminSidebar collapsed={collapsed} onCollapseChange={setCollapsed} />
      <div className={cn('flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200', collapsed ? 'lg:ml-18' : 'lg:ml-72')}>
        <AdminHeader titleKey={getTitleKey(location.pathname)} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
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