import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Pencil, Loader2, Upload } from 'lucide-react';
import { apiClient } from '@api/client';
import type { Case } from '@typings/index';

interface EvidenceItem {
  id: string;
  url: string;
}

export interface EditCasePayload {
  title?: string;
  side_a_content?: string;
  side_b_content?: string;
  category?: string;
  side_a_subtitle?: string | null;
  side_b_subtitle?: string | null;
  both_wrong_subtitle?: string | null;
  keepImageIds?: string[];
  newUrls?: string[];
}

interface EditCaseModalProps {
  caseData: Case;
  currentUserId?: string;
  onClose: () => void;
  onSubmit: (dto: EditCasePayload) => Promise<void>;
}

const CATEGORIES = ['Relationship', 'Friendship', 'Work', 'Family', 'Other'];

function EvidenceEditor({
  images,
  onKeepChange,
}: {
  images: EvidenceItem[];
  onKeepChange: (keepIds: string[], newFiles: File[]) => void;
}) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>(images.map((img) => img.id));
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const toggleImage = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const removeNewImage = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const maxNew = 5 - images.length;
      const fileArray = Array.from(files).slice(0, maxNew);
      setNewFiles((prev) => [...prev, ...fileArray]);
      setNewPreviews((prev) => [...prev, ...fileArray.map((f) => URL.createObjectURL(f))]);
    }
    e.currentTarget.value = '';
  };

  React.useEffect(() => {
    onKeepChange(selectedIds, newFiles);
  }, [selectedIds, newFiles]);

  return (
    <div className="space-y-3">
      {images.length === 0 && newPreviews.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-text-muted">{t('moderator.noImages')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto no-scrollbar">
          {images.map((img) => {
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
            <div key={`new-${idx}`} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-primary/50">
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
          <input type="file" multiple accept="image/*" onChange={handleAddImages} className="hidden" />
        </label>
      )}
    </div>
  );
}

export const EditCaseModal: React.FC<EditCaseModalProps> = ({ caseData, currentUserId, onClose, onSubmit }) => {
  const { t } = useTranslation();

  const isCreator = !!currentUserId && currentUserId === caseData.sideAUserId;
  const isSideB = !!currentUserId && currentUserId === caseData.sideBUserId;

  const [title, setTitle] = useState(caseData.title);
  const [sideAContent, setSideAContent] = useState(caseData.sideA.story);
  const [sideBContent, setSideBContent] = useState(caseData.sideB.story);
  const [category, setCategory] = useState(caseData.category || 'Other');
  const [sideASubtitle, setSideASubtitle] = useState(caseData.sideASubtitle || '');
  const [sideBSubtitle, setSideBSubtitle] = useState(caseData.sideBSubtitle || '');
  const [bothWrongSubtitle, setBothWrongSubtitle] = useState(caseData.bothWrongSubtitle || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepImageIds, setKeepImageIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const actorImages = (isCreator ? caseData.sideA.evidence : caseData.sideB.evidence) as EvidenceItem[];
  const hasErrors =
    (isCreator && (title.trim().length < 10 || sideAContent.trim().length < 10)) ||
    (isSideB && sideBContent.trim().length < 10);

  const handleSubmit = async () => {
    if (isSubmitting || hasErrors) return;
    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map((file) => {
          const formData = new FormData();
          formData.append('file', file);
          return apiClient.postForm<{ url: string; public_id: string }>('/upload/image', formData);
        });
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.map((r) => r.url);
      }
      await onSubmit({
        ...(isCreator ? {
          title: title.trim(),
          side_a_content: sideAContent.trim(),
          category,
          ...(caseData.type === 'vote' ? {
            side_a_subtitle: sideASubtitle.trim() || null,
            both_wrong_subtitle: bothWrongSubtitle.trim() || null,
          } : {}),
        } : {}),
        ...(isSideB ? {
          side_b_content: sideBContent.trim(),
          side_b_subtitle: sideBSubtitle.trim() || null,
        } : {}),
        keepImageIds,
        newUrls: uploadedUrls,
      });
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
        className="w-full max-w-2xl bg-card border border-border-main/5 rounded-[36px] p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                {isCreator ? t('cases.editingAsCreator') : t('cases.editingAsSideB')}
              </h4>
              <p className="text-xs text-text-muted font-medium">{t('cases.caseDetails')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-main" />
          </button>
        </div>

        <div className="space-y-5">
          {isCreator && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.editTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-3 bg-border-main/5 border border-border-main/10 rounded-2xl text-sm font-medium text-text-main outline-none focus:border-primary/50 transition-colors"
                />
                {title.trim().length < 10 && (
                  <p className="text-[10px] font-medium text-red-400">{t('cases.titleMinLength')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.story')}</label>
                <textarea
                  value={sideAContent}
                  onChange={(e) => setSideAContent(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-border-main/5 border border-border-main/10 rounded-2xl text-sm font-medium text-text-main outline-none focus:border-primary/50 transition-colors resize-none"
                />
                {sideAContent.trim().length < 10 && (
                  <p className="text-[10px] font-medium text-red-400">{t('cases.storyMinLength')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.category')}</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                        category === cat
                          ? 'bg-primary text-white'
                          : 'bg-border-main/5 text-text-muted hover:bg-border-main/10'
                      }`}
                    >
                      {t(`categories.${cat.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>

              {caseData.type === 'vote' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.sideA')}</label>
                    <input
                      type="text"
                      value={sideASubtitle}
                      onChange={(e) => setSideASubtitle(e.target.value)}
                      maxLength={50}
                      placeholder={t('cases.subtitlePlaceholderA')}
                      className="w-full px-4 py-3 bg-border-main/5 border border-border-main/10 rounded-2xl text-sm font-medium text-text-main outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.bothWrongShort')}</label>
                    <input
                      type="text"
                      value={bothWrongSubtitle}
                      onChange={(e) => setBothWrongSubtitle(e.target.value)}
                      maxLength={50}
                      placeholder={t('cases.subtitlePlaceholderBoth')}
                      className="w-full px-4 py-3 bg-border-main/5 border border-border-main/10 rounded-2xl text-sm font-medium text-text-main outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {isSideB && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.sideBContent')}</label>
                <textarea
                  value={sideBContent}
                  onChange={(e) => setSideBContent(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-border-main/5 border border-border-main/10 rounded-2xl text-sm font-medium text-text-main outline-none focus:border-secondary/50 transition-colors resize-none"
                />
                {sideBContent.trim().length < 10 && (
                  <p className="text-[10px] font-medium text-red-400">{t('cases.storyMinLength')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.sideB')}</label>
                <input
                  type="text"
                  value={sideBSubtitle}
                  onChange={(e) => setSideBSubtitle(e.target.value)}
                  maxLength={50}
                  placeholder={t('cases.subtitlePlaceholderB')}
                  className="w-full px-4 py-3 bg-border-main/5 border border-border-main/10 rounded-2xl text-sm font-medium text-text-main outline-none focus:border-secondary/50 transition-colors"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-text-muted" />
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t('cases.evidence')}</label>
            </div>
            <EvidenceEditor images={actorImages} onKeepChange={(ids, files) => { setKeepImageIds(ids); setNewFiles(files); }} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || hasErrors}
          className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
        </button>
      </motion.div>
    </motion.div>
  );
};
