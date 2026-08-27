import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger'
}) => {
  const { t } = useTranslation();

  const colors = {
    danger: {
      bg: 'bg-secondary/10',
      icon: 'text-secondary',
      button: 'bg-secondary hover:bg-secondary/90'
    },
    warning: {
      bg: 'bg-primary/10',
      icon: 'text-primary',
      button: 'bg-primary hover:bg-primary/90'
    },
    info: {
      bg: 'bg-primary/10',
      icon: 'text-primary',
      button: 'bg-primary hover:bg-primary/90'
    }
  };

  const color = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-250 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-card border border-border-main/5 rounded-[40px] p-6 text-center space-y-6"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-16 h-16 rounded-[24px] ${color.bg} flex items-center justify-center`}>
                <AlertTriangle className={`w-8 h-8 ${color.icon}`} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                  {title || t('common.confirm')}
                </h3>
                <p className="text-xs font-medium text-text-muted leading-relaxed">
                  {message || t('comments.deleteConfirm')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-full border border-border-main/20 text-text-muted font-black text-xs uppercase tracking-widest hover:bg-border-main/5 transition-colors disabled:opacity-50"
              >
                {cancelLabel || t('common.cancel')}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-3 px-4 rounded-full ${color.button} text-white font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {confirmLabel || t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
