import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Upload, ZoomIn } from 'lucide-react';
import { apiClient } from '@api/client';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/ui/Toast';

interface AvatarEditModalProps {
  onClose: () => void;
  onSaved?: (url: string) => void;
}

export const AvatarEditModal: React.FC<AvatarEditModalProps> = ({ onClose, onSaved }) => {
  const { t } = useTranslation();
  const { currentUser, updateProfile } = useAuth();
  const { addToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      addToast('error', t('profile.avatarError'));
      return;
    }
    setFile(selected);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  };

  const handleSave = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.postForm<{ url: string }>('/upload/avatar', formData);
      await updateProfile({ avatar: res.url });
      addToast('success', t('profile.avatarUpdated'));
      onSaved?.(res.url);
      onClose();
    } catch (err: any) {
      addToast('error', err.message || t('profile.avatarError'));
    } finally {
      setIsUploading(false);
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
        className="w-full max-w-md bg-card border border-border-main/5 rounded-[36px] p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-black italic uppercase tracking-tighter text-text-main">{t('profile.changeAvatar')}</h4>
            <p className="text-xs text-text-muted font-medium">{t('profile.avatarHint')}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-main" />
          </button>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowFullscreen(true)}
            className="relative group w-32 h-32 rounded-full border-4 border-primary/20 p-1 bg-background cursor-zoom-in"
            aria-label={t('profile.viewFullAvatar')}
          >
            <img
              src={preview || currentUser?.avatar}
              alt="Avatar"
              className="w-full h-full object-cover rounded-full aspect-square"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>

        <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border-main/20 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted hover:text-primary text-xs font-black uppercase tracking-widest">
          <Upload className="w-4 h-4" />
          {file ? t('profile.chooseAnother') : t('profile.chooseAvatar')}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={isUploading || !file}
          className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
        </button>
      </motion.div>

      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
          >
            <motion.img
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              src={preview || currentUser?.avatar}
              alt="Avatar"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
