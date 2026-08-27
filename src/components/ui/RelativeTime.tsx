import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface RelativeTimeProps {
  value: string | Date;
  className?: string;
}

export const RelativeTime: React.FC<RelativeTimeProps> = ({ value, className }) => {
  const { t, i18n } = useTranslation();
  
  const formatted = useMemo(() => {
    const date = value instanceof Date ? value : new Date(value);
    
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60_000) return t('time.justNow');

    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 60) {
      return t('time.minutesAgo', { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMs / 3_600_000);
    if (diffHours < 24) {
      return t('time.hoursAgo', { count: diffHours });
    }

    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays < 7) {
      return t('time.daysAgo', { count: diffDays });
    }

    return new Intl.DateTimeFormat(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }, [value, t, i18n.language]);

  return (
    <span className={className}>
      {formatted}
    </span>
  );
};
