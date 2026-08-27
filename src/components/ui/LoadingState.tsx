import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from './Skeleton';

export function LoadingState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center py-20 text-center">
      <Skeleton className="w-12 h-12 rounded-full mb-4" />
      <Skeleton className="h-4 w-48 rounded mb-2" />
      <Skeleton className="h-3 w-32 rounded" />
    </motion.div>
  );
}

export function LoadingSkeleton() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </motion.div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  titleKey: string;
}

export function EmptyState({ icon, titleKey }: EmptyStateProps) {
  const { t } = useTranslation();
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center py-20 text-center">
      {icon || <AlertCircle className="w-12 h-12 text-text-muted mb-4 opacity-20" />}
      <h3 className="text-lg font-bold text-text-main">{t(titleKey)}</h3>
    </motion.div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-bold text-text-main mb-2">{t('common.error')}</h3>
      <p className="text-text-muted max-w-xs mx-auto mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-primary text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          {t('common.retry')}
        </button>
      )}
    </motion.div>
  );
}
