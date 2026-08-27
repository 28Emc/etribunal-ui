import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Gavel, ArrowLeft, Loader2, CheckCircle, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@api/client';
import { cn } from '@utils/helpers';

function Countdown({ seconds = 3 }: { seconds?: number }) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    const timer = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return <div className="text-4xl font-black text-primary">{count}</div>;
}

interface ForgotPasswordProps {
  onBackToLogin?: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (value: string): string => {
    if (!value) return t('auth.emailRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return t('auth.validEmail');
    return '';
  };

  const handleBlur = () => {
    if (email) {
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email, language: i18n.language });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t('auth.forgotPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        handleBack();
      }, 3000);
    }
  }, [success]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 bg-background flex items-center justify-center p-6 overflow-y-auto"
    >
      <button
        onClick={handleBack}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 transition-colors z-10"
      >
        <X className="w-5 h-5 text-text-main" />
      </button>

      <AnimatePresence mode="wait">
        {success ? (
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
            <h2 className="text-2xl font-black text-text-main mb-2">{t('auth.checkYourInbox')}</h2>
            <p className="text-text-muted text-sm mb-2">
              {t('auth.passwordResetSent')}
            </p>
            <p className="text-text-muted text-xs mb-6">{t('auth.redirectingToLogin')}</p>
            <Countdown />
          </motion.div>
        ) : (
          <motion.div
            key="form-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md flex flex-col items-center py-10"
          >
            <div className="flex flex-col items-center mb-10 text-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-primary rounded-[24px] flex items-center justify-center shadow-[0_20px_40px_rgba(51,102,153,0.3)] mb-6 border border-white/10"
              >
                <Gavel className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-black text-text-main mb-2">{t('auth.forgotPassword')}</h2>
              <p className="text-text-muted text-sm">{t('auth.enterEmailReset')}</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="sr-only">{t('auth.emailAddress')}</label>
                <div className="relative">
                  <Mail className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    error ? "text-red-500" : "text-text-muted"
                  )} />
                  <input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailAddress')}
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    onBlur={handleBlur}
                    aria-invalid={!!error}
                    aria-describedby={error ? "email-error" : undefined}
                    className={cn(
                      "w-full h-14 bg-card border rounded-2xl pl-14 pr-6 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
                      error
                        ? "border-red-500/50 focus:ring-red-500/10"
                        : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                    )}
                  />
                </div>
                {error && (
                  <p id="email-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110 hover:scale-[1.02] active:scale-95 focus:ring-4 focus:ring-primary/30 transition-all mt-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t('auth.sendResetLink')
                )}
              </button>
            </form>

            <button
              onClick={handleBack}
              className="mt-8 flex items-center gap-2 text-text-muted text-sm font-bold hover:text-text-main transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToLogin')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
