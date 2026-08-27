import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  username,
  onClose,
  onConfirm
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleConfirmClick = () => {
    if (inputValue.toLowerCase() === username.toLowerCase()) {
      setIsConfirming(true);
      onConfirm();
    }
  };

  const handleClose = () => {
    setInputValue('');
    setIsConfirming(false);
    onClose();
  };

  const isConfirmDisabled = inputValue.toLowerCase() !== username.toLowerCase() || isConfirming;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-250 flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

{/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border-main/5 rounded-[40px] p-8 text-center space-y-8"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-[30px] bg-secondary/10 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-secondary" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">
                  {t('deleteAccount.suspendAccount')}
                </h3>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest leading-relaxed">
                  {t('deleteAccount.accountWillBeSuspended')}
                </p>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-3">
              <div className="text-left space-y-2">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest">
                  {t('deleteAccount.typeToConfirm')} <span className="text-text-main font-mono bg-border-main/10 px-2 py-1 rounded">{username}</span> {t('deleteAccount.toConfirm')}
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  disabled={isConfirming}
                  className="w-full px-4 py-3 bg-border-main/5 border border-border-main/20 rounded-[16px] text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder={t('deleteAccount.enterUsername')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isConfirmDisabled) {
                      handleConfirmClick();
                    }
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirmClick}
                disabled={isConfirmDisabled}
                className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all outline-none focus:ring-4 focus:ring-secondary/20 ${isConfirmDisabled
                    ? 'bg-secondary/30 text-white/50 cursor-not-allowed'
                    : 'bg-secondary text-white shadow-[0_10px_30px_rgba(255,102,0,0.3)] hover:brightness-110 hover:scale-[1.02] active:scale-95'
                  }`}
              >
                {isConfirming ? t('deleteAccount.suspending') : t('deleteAccount.suspend')}
              </button>
              <button
                onClick={handleClose}
                disabled={isConfirming}
                className="w-full py-5 bg-border-main/10 text-text-muted rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-border-main/20 hover:text-text-main hover:scale-[1.02] active:scale-95 transition-all outline-none focus:ring-4 focus:ring-border-main/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('deleteAccount.cancel')}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
