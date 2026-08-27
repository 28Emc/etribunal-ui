import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, Loader2, CheckCircle, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO } from '@shared/components/SEO';
import { apiClient } from '@api/client';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError(t('auth.invalidOrExpired'));
        setLoading(false);
        return;
      }

      try {
        const result = await apiClient.post<any>('/auth/verify-email', { token });
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setError(result.message || t('auth.verificationFailed'));
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err?.message || t('auth.verificationFailed'));
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 bg-background flex items-center justify-center p-6 overflow-y-auto"
    >
      <SEO title={t('auth.verifyEmail')} />
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors z-10"
      >
        <X className="w-5 h-5 text-text-main" />
      </button>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md flex flex-col items-center py-10 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 bg-primary rounded-[24px] flex items-center justify-center shadow-[0_20px_40px_rgba(51,102,153,0.3)] mb-6 border border-white/10"
            >
              <Gavel className="w-10 h-10 text-white" />
            </motion.div>
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-text-muted text-sm mt-4">{t('common.loading')}</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md flex flex-col items-center py-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <AlertCircle className="w-10 h-10 text-red-500" />
            </motion.div>
            <h2 className="text-2xl font-black text-text-main mb-4">{t('auth.verificationFailed')}</h2>
            <p className="text-text-muted text-sm mb-8">
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              className="text-primary text-sm font-bold hover:underline underline-offset-4"
            >
              {t('common.back')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="success-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md flex flex-col items-center py-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-500" />
            </motion.div>
            <h2 className="text-2xl font-black text-text-main mb-4">{t('auth.emailVerified')}</h2>
            <p className="text-text-muted text-sm mb-2">
              {t('auth.emailVerifiedMessage')}
            </p>
            <p className="text-text-muted text-xs mb-8">
              {t('auth.redirectingToLogin')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
