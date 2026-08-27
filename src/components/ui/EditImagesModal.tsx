import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { apiClient } from '@api/client';

interface ImageItem {
  id: string;
  url: string;
}

interface EditImagesModalProps {
  images: ImageItem[];
  onClose: () => void;
  onSubmit: (keepImageIds: string[], newUrls: string[]) => Promise<void>;
}

export const EditImagesModal: React.FC<EditImagesModalProps> = ({ images, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>(images.map(img => img.id));
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleImage = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const removeNewImage = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const maxNew = 5 - images.length;
      const fileArray = Array.from(files).slice(0, maxNew);
      setNewFiles(prev => [...prev, ...fileArray]);
      setNewPreviews(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))]);
    }
    e.currentTarget.value = '';
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          return apiClient.postForm('/upload/image', formData) as Promise<{ url: string; public_id: string }>;
        });
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.map(r => r.url);
      }
      await onSubmit(selectedIds, uploadedUrls);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const totalKept = selectedIds.length + newPreviews.length;
  const hasChanges = selectedIds.length !== images.length || newFiles.length > 0;

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
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-xl font-black italic uppercase tracking-tighter text-text-main">{t('moderator.editImagesTitle')}</h4>
              <p className="text-xs text-text-muted font-medium">{t('moderator.editImagesDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-main" />
          </button>
        </div>

        {images.length === 0 && newPreviews.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-text-muted">{t('moderator.noImages')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto no-scrollbar">
            {images.map(img => {
              const isSelected = selectedIds.includes(img.id);
              return (
                <button
                  key={img.id}
                  onClick={() => toggleImage(img.id)}
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-primary shadow-[0_0_0_1px_rgba(51,102,153,0.28)]'
                      : 'border-border-main/10 opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      {isSelected ? t('moderator.keepImages') : t('common.delete')}
                    </span>
                  </div>
                </button>
              );
            })}
            {newPreviews.map((url, idx) => (
              <div
                key={`new-${idx}`}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-primary/50"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('moderator.keepImages')}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeNewImage(idx); }}
                    className="w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length + newFiles.length < 5 && (
          <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border-main/20 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted hover:text-primary text-xs font-black uppercase tracking-widest">
            <Upload className="w-4 h-4" />
            {t('moderator.addImages')}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleAddImages}
              className="hidden"
            />
          </label>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!hasChanges)}
          className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t('common.save')
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};
