import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Image as ImageIcon, Send, AlertCircle, Quote, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@utils/helpers';
import type { Case } from '@typings/index';
import { apiClient, authStorage } from '@api/client';
import { Tooltip } from '@components/ui/Tooltip';

interface ImageFile {
  url: string;
  file: File;
}

interface JoinCaseProps {
  caseData: Case;
  onSubmit: (story: string, images: string[], isAnonymous: boolean) => Promise<void>;
}

export const JoinCase: React.FC<JoinCaseProps> = ({ caseData, onSubmit }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [story, setStory] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'view' | 'respond'>('view');

  const isAssignedUser = !!caseData.sideBUserId;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => ({
        url: URL.createObjectURL(file),
        file
      }));
      setImages(prev => [...prev, ...newImages]);
    }
    e.currentTarget.value = '';
  };

const uploadImagesToCloudinary = async (imageFiles: ImageFile[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const img of imageFiles) {
    try {
      const formData = new FormData();
      formData.append('file', img.file);
      formData.append('folder', 'etribunal');

      const result = await apiClient.postForm('/upload/image', formData) as unknown as { url: string; public_id: string };
      uploadedUrls.push(result.url);
    } catch (err) {
      console.error('Error uploading image:', err);
    }
  }

  return uploadedUrls;
};

  const handleClose = () => {
    navigate('/', { replace: true });
  };

  const handleSubmitFn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (story.length < 25 || story.length > 2000) return;

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      const uploadedUrls = await uploadImagesToCloudinary(images);
      await onSubmit(story, uploadedUrls, isAnonymous);
    } catch (error) {
      console.error('Error in submit:', error);
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col"
    >
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-10 pb-32">
        {step === 'view' ? (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-10"
          >
            {/* Case Intro */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-secondary/20 px-4 py-1.5 rounded-full border border-secondary/30">
                <AlertCircle className="w-4 h-4 text-secondary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{t('joinCase.youveBeenSummoned')}</span>
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-[0.9] text-text-main">
                {caseData.title}
              </h2>
            </div>

            {/* Side A's Accusation */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden">
                  <img src={caseData.sideA.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h4 className="font-black text-xl leading-none italic uppercase tracking-tighter text-text-main">{caseData.sideA.name}</h4>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('joinCase.theAccuser')}</span>
                </div>
              </div>

              <div className="relative">
                <Quote className="absolute -top-4 -left-4 w-12 h-12 text-text-main/5 -z-10" />
                <div className="bg-card p-8 rounded-[40px] border border-border-main/10 text-xl font-medium text-text-main leading-snug italic">
                  "{caseData.sideA.story}"
                </div>
              </div>

              {/* Side A Evidence Preview */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {caseData.sideA.evidence.map(e => (
                  <div key={e.id || `join-evidence-${e.url}`} className="min-w-[140px] h-20 rounded-2xl overflow-hidden border border-border-main/10 grayscale opacity-50">
                    <img src={e.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA to Respond */}
            <div className="pt-10">
<button
                onClick={() => setStep('respond')}
                className="w-full h-14 bg-text-main text-background py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                {t('joinCase.tellYourSide')}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onSubmit={handleSubmitFn}
            className="space-y-10"
          >
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">{t('joinCase.yourDefense')}</h3>
              <p className="text-text-muted text-sm font-medium">{t('joinCase.respondWithYourStory')}</p>
            </div>

            {/* Story Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">{t('joinCase.yourStory')}</label>
                <span className={cn("text-[9px] font-bold uppercase", story.length < 25 ? "text-secondary" : "text-text-muted/40")}>
                  {story.length}/2000
                  {story.length < 25 && " (Min 25)"}
                </span>
              </div>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                maxLength={2000}
                placeholder={t('cases.whatReallyHappened')}
                className="w-full bg-card border border-border-main/10 rounded-[32px] p-8 text-xl font-medium text-text-main leading-snug focus:border-secondary focus:outline-none transition-all min-h-[250px] resize-none placeholder:text-text-muted/40"
                autoFocus
              />
            </div>

            {/* Evidence Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">{t('joinCase.evidence')}</label>
                <span className="text-[10px] font-bold text-text-muted uppercase">{images.length}/5 Images</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {images.map((img, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={idx}
                    className="aspect-4/3 rounded-2xl overflow-hidden border border-border-main/10 relative group"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </motion.div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-4/3 rounded-2xl border-2 border-dashed border-border-main/10 flex flex-col items-center justify-center gap-2 hover:border-secondary/50 hover:bg-secondary/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center group-hover:bg-secondary/20 group-hover:scale-110 transition-all">
                      <ImageIcon className="w-5 h-5 text-text-muted group-hover:text-secondary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-secondary">{t('joinCase.addEvidence')}</span>
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                multiple
                accept="image/*"
              />
            </div>

            {/* Anonymous Toggle - only show for public invites */}
            {!isAssignedUser && (
              <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border-main/10 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    isAnonymous ? "bg-secondary" : "bg-border-main/30"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                    isAnonymous ? "left-6" : "left-1"
                  )} />
                </button>
                <span className="text-sm font-medium text-text-muted">
                  {t('joinCase.anonymousResponse') || 'Responder de forma anónima'}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="md:p-6 md:glass md:relative md:bg-transparent md:border-none md:p-0 md:mt-10 md:max-w-none">
              <button
                type="submit"
                disabled={isSubmitting || story.length < 25}
                className={cn(
                  "w-full h-14 py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95",
                  isSubmitting || story.length < 25
                    ? "bg-border-main/10 text-text-muted cursor-not-allowed"
                    : "bg-secondary text-white shadow-[0_10px_20px_rgba(255,102,0,0.3)] hover:brightness-110"
                )}
              >
                {isSubmitting ? (
                  isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('joinCase.uploadingEvidence')}
                    </>
                  ) : (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {t('joinCase.submitYourSide')}
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </motion.div>
  );
};
