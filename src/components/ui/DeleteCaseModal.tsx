import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Trash2, Loader2 } from 'lucide-react';

interface DeleteCaseModalProps {
  caseTitle: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const DeleteCaseModal: React.FC<DeleteCaseModalProps> = ({ caseTitle, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[180] bg-black/60 p-4 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-card border border-border-main/5 rounded-[36px] p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h4 className="text-xl font-black italic uppercase tracking-tighter text-text-main">{t('moderator.deleteCase')}</h4>
              <p className="text-xs text-text-muted font-medium truncate max-w-[300px]">{caseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-main" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-widest text-text-muted">
            {t('moderator.deleteReason')}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('moderator.deletePlaceholder')}
            className="w-full bg-border-main/5 border border-border-main/10 rounded-[28px] p-4 text-sm font-medium focus:outline-none focus:border-red-400 transition-all min-h-[120px] resize-none text-text-main"
            disabled={isSubmitting}
          />
          <p className="text-xs text-text-muted font-medium">{t('moderator.deleteConfirm')}</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!reason.trim() || isSubmitting}
          className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t('moderator.deleteSubmit')
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};
