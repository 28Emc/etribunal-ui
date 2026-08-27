import React from 'react';
import { ThumbsUp, Heart, Angry } from 'lucide-react';
import { cn } from '@utils/helpers';

export type ReactionType = 'LIKE' | 'LOVE' | 'ANGRY';

interface ReactionIconProps {
  type: ReactionType;
  size?: 'sm' | 'md' | 'lg';
  filled?: boolean;
  className?: string;
}

const useTheme = () => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return isDark;
};

const iconConfig = {
  LIKE: {
    icon: ThumbsUp,
    lightModeClass: 'text-blue-700',
    darkModeClass: 'text-blue-400',
  },
  LOVE: {
    icon: Heart,
    lightModeClass: 'text-pink-700',
    darkModeClass: 'text-pink-400',
  },
  ANGRY: {
    icon: Angry,
    lightModeClass: 'text-red-700',
    darkModeClass: 'text-red-400',
  },
};

export const ReactionIcon: React.FC<ReactionIconProps> = ({
  type,
  size = 'md',
  filled = false,
  className,
}) => {
  const isDark = useTheme();
  const config = iconConfig[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5.5 h-5.5',
  };

  return (
    <Icon
      className={cn(
        sizeClasses[size],
        filled ? 'fill-current' : '',
        isDark ? config.darkModeClass : config.lightModeClass,
        className
      )}
    />
  );
};

export const getReactionColor = (type: ReactionType): string => {
  const isDark = useTheme();
  const colors = {
    LIKE: isDark ? 'text-blue-400' : 'text-blue-700',
    LOVE: isDark ? 'text-pink-400' : 'text-pink-700',
    ANGRY: isDark ? 'text-red-400' : 'text-red-700',
  };
  return colors[type];
};

export const getReactionBgColor = (type: ReactionType): string => {
  const isDark = useTheme();
  const colors = {
    LIKE: isDark ? 'bg-blue-400/20' : 'bg-blue-700/20',
    LOVE: isDark ? 'bg-pink-400/20' : 'bg-pink-700/20',
    ANGRY: isDark ? 'bg-red-400/20' : 'bg-red-700/20',
  };
  return colors[type];
};

export const getReactionBorderColor = (type: ReactionType): string => {
  const isDark = useTheme();
  const colors = {
    LIKE: isDark ? 'border-blue-400' : 'border-blue-700',
    LOVE: isDark ? 'border-pink-400' : 'border-pink-700',
    ANGRY: isDark ? 'border-red-400' : 'border-red-700',
  };
  return colors[type];
};
