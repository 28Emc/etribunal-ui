import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Gavel, ArrowLeft, Loader2, CheckCircle, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@api/client';
import { cn } from '@utils/helpers';

function Countdown({ seconds = 3, onComplete }: { seconds?: number; onComplete: () => void }) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return <div className="text-5xl font-black text-primary">{count}</div>;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface ResetPasswordProps {
  onPasswordReset?: () => void;
}

export function ResetPassword({ onPasswordReset }: ResetPasswordProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const validateField = (name: keyof FormErrors, value: string): string => {
    switch (name) {
      case 'password':
        if (!value) return t('auth.passwordRequired');
        if (value.length < 8) return t('auth.passwordMinLength');
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) return t('auth.passwordRequirements');
        return '';
      case 'confirmPassword':
        if (!value) return t('auth.confirmPassword') || 'Please confirm your password';
        if (value !== password) return t('auth.passwordsDoNotMatch');
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    const value = field === 'password' ? password : confirmPassword;
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(err => err !== '')) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setErrors({ general: err.message || t('auth.resetPasswordError') });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/login');
  };

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
        {tokenError ? (
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
            <h2 className="text-2xl font-black text-text-main mb-4">{t('auth.invalidOrExpired')}</h2>
            <p className="text-text-muted text-sm mb-8">
              {t('auth.tokenExpiredMessage')}
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="text-primary text-sm font-bold hover:underline underline-offset-4"
            >
              {t('auth.requestNewLink')}
            </button>
          </motion.div>
        ) : success ? (
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
            <h2 className="text-2xl font-black text-text-main mb-2">{t('auth.passwordResetSuccess')}</h2>
            <p className="text-text-muted text-sm mb-2">
              {t('auth.redirectingToLogin')}
            </p>
            <Countdown seconds={3} onComplete={() => navigate('/login')} />
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
              <h2 className="text-2xl font-black text-text-main mb-2">{t('auth.newPassword')}</h2>
              <p className="text-text-muted text-sm">{t('auth.createNewPassword')}</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  role="alert"
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold leading-relaxed">{errors.general}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="sr-only">{t('auth.newPassword')}</label>
                <div className="relative">
                  <Lock className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    errors.password ? "text-red-500" : "text-text-muted"
                  )} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.newPassword')}
                    required
                    autoComplete="off"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
                    onBlur={() => handleBlur('password')}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={cn(
                      "w-full h-14 bg-card border rounded-2xl pl-14 pr-14 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
                      errors.password
                        ? "border-red-500/50 focus:ring-red-500/10"
                        : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 dark:text-white" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="sr-only">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    errors.confirmPassword ? "text-red-500" : "text-text-muted"
                  )} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('auth.confirmPassword')}
                    required
                    autoComplete="off"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                    onBlur={() => handleBlur('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    className={cn(
                      "w-full h-14 bg-card border rounded-2xl pl-14 pr-14 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
                      errors.confirmPassword
                        ? "border-red-500/50 focus:ring-red-500/10"
                        : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 dark:text-white" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
                    {errors.confirmPassword}
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
                  t('auth.resetPassword')
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
