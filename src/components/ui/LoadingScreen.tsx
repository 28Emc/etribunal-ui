import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@hooks/useTheme';

export function LoadingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background"
      role="status"
      aria-label={t('common.loading')}
    >
      <motion.img
        src={theme === 'dark' ? '/icons/eTribunal-isotipo-bn.png' : '/icons/eTribunal-isotipo.png'}
        alt="eTribunal"
        className="h-20 w-auto pointer-events-none select-none"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
        {t('common.loading')}
      </span>
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </motion.div>
  );
}