import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Copy, Check, MessageCircle, Share2, ExternalLink, Mail, Send } from 'lucide-react';
import { cn } from '@utils/helpers';
import { Tooltip } from '@components/ui/Tooltip';
import { useShare, generateShareUrl, getWhatsAppLink, getTwitterLink, getTelegramLink, getEmailLink } from '@shared/hooks/useShare';
import type { ShareType } from '@shared/hooks/useShare';
import { useToast } from '@components/ui/Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ShareType;
  id: string;
  title?: string;
  username?: string;
}

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3000';

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  type = 'case',
  id,
  title,
  username
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { share, copyToClipboard, isWebShareSupported } = useShare();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const shareData = { type, id, title, username };
  const shareUrl = generateShareUrl(shareData);

  const handleShareNative = async () => {
    setIsSharing(true);
    const success = await share(shareData);
    setIsSharing(false);
    if (success) {
      onClose();
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(shareData);
    if (success) {
      setCopied(true);
      addToast('success', t('share.copied'));
      setTimeout(() => setCopied(false), 2000);
    } else {
      addToast('error', t('errors.copyFailed'));
    }
  };

  const handleSocialClick = (social: string) => {
    let url = '';
    const shareUrlWithTracking = shareUrl.includes('?') 
      ? `${shareUrl}&utm_source=share&utm_medium=${social}` 
      : `${shareUrl}?utm_source=share&utm_medium=${social}`;
    
    switch (social) {
      case 'whatsapp':
        url = getWhatsAppLink({ ...shareData, url: shareUrlWithTracking });
        break;
      case 'twitter':
        url = getTwitterLink({ ...shareData, url: shareUrlWithTracking });
        break;
      case 'telegram':
        url = getTelegramLink({ ...shareData, url: shareUrlWithTracking });
        break;
      case 'email':
        url = getEmailLink({ ...shareData, url: shareUrlWithTracking });
        break;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'case':
        return t('share.shareThisCase');
      case 'profile':
        return t('share.shareThisProfile');
      default:
        return t('share.shareThis');
    }
  };

  const socialActions = [
    { 
      id: 'whatsapp',
      icon: MessageCircle, 
      name: 'WhatsApp', 
      color: 'bg-[#25D366]',
      href: getWhatsAppLink(shareData)
    },
    { 
      id: 'twitter',
      icon: MessageCircle, 
      name: 'X', 
      color: 'bg-black border border-white/10',
      href: getTwitterLink(shareData)
    },
    { 
      id: 'telegram',
      icon: Send, 
      name: 'Telegram', 
      color: 'bg-[#0088cc]',
      href: getTelegramLink(shareData)
    },
    { 
      id: 'email',
      icon: Mail, 
      name: t('share.email'), 
      color: 'bg-gray-600',
      href: getEmailLink(shareData)
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[160] bg-background rounded-t-[40px] border-t border-border-main/10 p-6 pb-8 lg:max-w-md lg:mx-auto"
          >
            <div className="w-12 h-1.5 bg-border-main/10 rounded-full mx-auto mb-6" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                {getTitle()}
              </h2>
              <Tooltip content={t('tooltips.close')}>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors"
                >
                  <X className="w-5 h-5 text-text-main" />
                </button>
              </Tooltip>
            </div>

            {isWebShareSupported() && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleShareNative}
                disabled={isSharing}
                className="w-full flex items-center justify-center gap-3 p-4 mb-6 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest text-sm shadow-[0_5px_15px_rgba(51,102,153,0.4)] hover:brightness-110 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {isSharing ? t('share.sharing') : t('share.shareNative')}
              </motion.button>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
              {socialActions.map((social) => (
                <motion.button
                  key={social.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSocialClick(social.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={cn("w-14 h-14 rounded-[20px] flex items-center justify-center shadow-lg", social.color)}>
                    <social.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">{social.name}</span>
                </motion.button>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary px-2">
                {t('share.copyLink')}
              </label>
              <div className="relative group">
                <div className="relative group w-full h-14 bg-card border border-border-main/10 rounded-[24px] flex items-center px-4 overflow-hidden">
                  <span className="truncate pr-28">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "absolute right-1 top-1 bottom-1 px-4 rounded-[18px] font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2",
                    copied ? "bg-green-500 text-white" : "bg-primary text-white hover:brightness-110"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('share.copied') : t('share.copy')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
