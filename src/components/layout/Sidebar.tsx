import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, User, Settings, TrendingUp } from 'lucide-react';
import { cn } from '@utils/helpers';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProfileClick: () => void;
  onCreateClick: () => void;
  onSettingsClick: () => void;
  userAvatar?: string;
}

const TAB_ROUTES: Record<string, string> = {
  'for_you': '/cases',
  'following': '/cases/following',
  'trending': '/cases/trending',
};

export const Sidebar = ({
  activeTab,
  onTabChange,
  onProfileClick,
  onCreateClick,
  onSettingsClick,
  userAvatar
}: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: Array<{ id: string; icon: React.ForwardRefExoticComponent<any>; label: string; onClick?: () => void }> = [
    { id: 'for_you', icon: Home, label: t('nav.feed') },
    { id: 'following', icon: User, label: t('profile.following') },
    { id: 'trending', icon: TrendingUp, label: t('sidebar.trending') },
  ];

  const handleTabClick = (item: typeof navItems[0]) => {
    if (item.onClick) {
      item.onClick();
      return;
    }
    onTabChange(item.id);
    const route = TAB_ROUTES[item.id];
    if (route && location.pathname !== route) {
      navigate(route);
    }
  };

  return (
    <div className="flex flex-col w-64 xl:w-72 h-full py-8">
      <nav className="flex-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group",
              activeTab === item.id
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-border-main/5 hover:text-text-main"
            )}
          >
            <item.icon className={cn(
              "w-6 h-6 transition-transform group-hover:scale-110",
              activeTab === item.id ? "text-primary" : "text-text-muted"
            )} />
            <span className="text-lg font-black uppercase tracking-widest italic">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-none mt-auto">
        <button
          onClick={onCreateClick}
          className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] italic shadow-[0_10px_30px_rgba(51,102,153,0.3)] hover:brightness-110 hover:shadow-[0_10px_30px_rgba(51,102,153,0.5)] transition-all flex items-center justify-center gap-3 mb-6"
        >
          <Plus className="w-6 h-6" />
          <span>{t('layout.newCase')}</span>
        </button>

        <button
          onClick={onSettingsClick}
          className="flex items-center gap-4 px-4 py-4 rounded-2xl text-text-muted hover:bg-border-main/5 hover:text-text-main transition-all group"
        >
          <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
          <span className="text-sm font-black uppercase tracking-widest italic">{t('layout.settings')}</span>
        </button>
      </div>
    </div>
  );
};
