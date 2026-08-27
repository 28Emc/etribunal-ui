import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Globe, Apple, MessageCircle, User as UserIcon, ShieldCheck, AlertCircle, X, Loader2, CheckCircle, Eye, EyeOff, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User } from '@typings/index';
import { apiClient, authStorage } from '@api/client';
import { useAuth } from '@context/AuthContext';
import { cn } from '@utils/helpers';
import { useDebounce } from '@hooks/useDebounce';

function SuccessOverlay({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center text-center p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle className="w-12 h-12 text-green-500" />
      </motion.div>
      <h2 className="text-3xl font-black text-white mb-2">{t('auth.checkYourInbox')}</h2>
      <p className="text-zinc-400 text-sm mb-2">{t('auth.verificationEmailSent')}</p>
      <p className="text-zinc-500 text-xs mb-6">{t('auth.redirectingToLogin')}</p>
      <div className="text-5xl font-black text-primary">{countdown}</div>
    </div>
  );
}

interface LoginProps {
  onOpenTerms?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  onLoginSuccess?: () => void;
  initialIsSignUp?: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  username?: string;
  general?: string;
}

export const Login: React.FC<LoginProps> = ({ onOpenTerms, isModal = false, onClose, onLoginSuccess, initialIsSignUp = false }) => {
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);

  useEffect(() => {
    setIsSignUp(initialIsSignUp);
  }, [initialIsSignUp]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const debouncedEmail = useDebounce(email, 1000);
  const debouncedUsername = useDebounce(username, 1000);

  useEffect(() => {
    if (isModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isModal]);

  useEffect(() => {
    const checkEmailExistence = async () => {
      if (!isSignUp || !debouncedEmail || debouncedEmail.length < 5) {
        setEmailExists(false);
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(debouncedEmail)) {
        setEmailExists(false);
        return;
      }
      
      setCheckingEmail(true);
      try {
        const result = await apiClient.get(
          `/auth/check-existence?email=${encodeURIComponent(debouncedEmail)}`
        ) as { emailExists: boolean };
        setEmailExists(result.emailExists);
      } catch {
        setEmailExists(false);
      } finally {
        setCheckingEmail(false);
      }
    };
    
    checkEmailExistence();
  }, [debouncedEmail, isSignUp]);

  useEffect(() => {
    const checkUsernameExistence = async () => {
      if (!isSignUp || !debouncedUsername || debouncedUsername.length < 5) {
        setUsernameExists(false);
        setUsernameChecked(false);
        return;
      }
      
      setCheckingUsername(true);
      setUsernameChecked(false);
      try {
        const result = await apiClient.get(
          `/auth/check-existence?username=${encodeURIComponent(debouncedUsername)}`
        ) as { usernameExists: boolean };
        setUsernameExists(result.usernameExists);
        setUsernameChecked(true);
      } catch {
        setUsernameExists(false);
        setUsernameChecked(true);
      } finally {
        setCheckingUsername(false);
      }
    };
    
    checkUsernameExistence();
  }, [debouncedUsername, isSignUp]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value) return t('auth.emailRequired');
        if (isSignUp) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return t('auth.validEmail');
        }
        return '';
      case 'password':
        if (!value) return t('auth.passwordRequired');
        if (value.length < 8) return t('auth.passwordMinLength');
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(value)) {
          return t('auth.passwordRequirements');
        }
        return '';
      case 'username':
        if (isSignUp) {
          if (!value.trim()) return t('auth.usernameRequired');
          if (value.length < 5) return t('auth.usernameMinLength');
          if (value.length > 12) return t('auth.usernameMaxLength');
        }
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    const value = field === 'email' ? email : field === 'password' ? password : username;
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateField('email', email),
      password: validateField('password', password),
      username: isSignUp ? validateField('username', username) : '',
    };

    if (isSignUp && usernameExists) {
      newErrors.username = t('validation.usernameTaken');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(err => err !== '');
  };

  const handleAuthSuccess = (user: User) => {
    login(user);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
    if (isModal && onClose) {
      onClose();
    }
    // Removing window.location.reload() to fix flickering issues on register
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        const data = await apiClient.post('/auth/register', {
          username,
          email,
          password,
          language: i18n.language
        }) as any;

        const userData = data.user || data.data?.user || data;
        const needsEmailVerification = data.email_verification_required ?? data.data?.email_verification_required;

        if (needsEmailVerification) {
          setLoading(false);
          setEmail('');
          setPassword('');
          setUsername('');
          setShowSuccessOverlay(true);
          setTimeout(() => {
            setShowSuccessOverlay(false);
            setIsSignUp(false);
          }, 3000);
          return;
        }

        if (!userData?.id) {
          setErrors({ general: t('auth.authError') });
          setLoading(false);
          return;
        }

        authStorage.setTokens(
          data.access_token || data.data?.access_token,
          data.refresh_token || data.data?.refresh_token
        );

        const mappedUser: User = {
          id: userData.id,
          name: userData.username,
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar_url || userData.avatar || `https://picsum.photos/seed/${userData.id}/200`,
          hasPassword: userData.hasPassword || userData.password_hash,
          casesCreated: [],
          votes: userData.votes || {},
          role: userData.role,
        };
        handleAuthSuccess(mappedUser);
      } else {
        const data = await apiClient.post('/auth/login', {
          email,
          password
        }) as any;

        // The backend login might return double-wrapped data or direct user object
        const userData = data.user || data.data?.user;
        const accessToken = data.access_token || data.data?.access_token;
        const refreshToken = data.refresh_token || data.data?.refresh_token;

        if (accessToken) {
          authStorage.setTokens(accessToken, refreshToken, rememberMe);
        }

        const mappedUser: User = {
          id: userData.id,
          name: userData.username,
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar_url || userData.avatar || `https://picsum.photos/seed/${userData.id}/200`,
          hasPassword: userData.hasPassword,
          casesCreated: [],
          votes: userData.votes || {},
          role: userData.role,
        };
        handleAuthSuccess(mappedUser);
      }
    } catch (err: any) {
      const message = err.message || '';
      if (err.status === 429) {
        setErrors({ general: message.startsWith('ThrottlerException') ? t('auth.tooManyAttempts') : message });
      } else if (message.startsWith('SOCIAL_AUTH_REQUIRED:')) {
        const provider = message.split(':')[1];
        const formattedProvider = provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
        setErrors({ general: t('auth.socialAccountError', { provider: formattedProvider }) });
      } else {
        setErrors({ general: message || t('auth.authError') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple' | 'facebook') => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
    window.location.href = `${baseUrl}/auth/${provider}`;
  };

  const containerClass = isModal
    ? "fixed inset-0 z-120 bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
    : "fixed inset-0 z-100 bg-background flex items-center justify-center p-6 overflow-y-auto";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={containerClass}
      aria-labelledby="login-title"
    >
      {showSuccessOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
        >
          <SuccessOverlay onComplete={() => setShowSuccessOverlay(false)} />
        </motion.div>
      )}

      <button
        onClick={() => {
          if (onClose) {
            onClose();
          } else {
            navigate('/');
          }
        }}
        className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-border-main/10 flex items-center justify-center hover:bg-border-main/20 active:bg-border-main/30 transition-colors z-10"
      >
        <X className="w-5 h-5 text-text-main" />
      </button>
      <AnimatePresence mode="wait">
        <motion.div
          key={isSignUp ? 'signup-view' : 'login-view'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-md flex flex-col items-center py-10"
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10 text-center">
            <motion.img
              src="/icons/eTribunal-isotipo.png"
              alt="eTribunal"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mb-6"
            />
            <h1 id="login-title" className="text-3xl font-black italic tracking-tighter text-text-main mb-2">eTribunal</h1>
            <p className="text-text-muted font-bold tracking-[.25em] uppercase text-[10px] opacity-60">{t('auth.twoSidesOneVerdict')}</p>
          </div>

          {/* Social Logins */}
          <section className="w-full mb-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-6 opacity-40">{t('auth.continueWith')}</p>
            <div className="grid grid-cols-3 gap-3 w-full" aria-label="Social login options">
              <button
                onClick={() => handleSocialLogin('google')}
                className="group flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg overflow-hidden"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-[#f44242]" />
                </div>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-[#000000]">Google</span>
              </button>

              <button
                onClick={() => handleSocialLogin('apple')}
                className="group flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-black rounded-2xl border border-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg overflow-hidden"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-white" />
                </div>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-white">Apple</span>
              </button>

              <button
                onClick={() => handleSocialLogin('facebook')}
                className="group flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-[#FFFFFF] rounded-2xl border border-[#1877F2]/20 hover:scale-105 active:scale-95 transition-all shadow-lg overflow-hidden"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#1877F2] fill-current" />
                </div>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-[#1877F2]">Facebook</span>
              </button>
            </div>
          </section>

          {/* Divider */}
          <div className="w-full flex items-center gap-4 mb-8" aria-hidden="true">
            <div className="flex-1 h-px bg-border-main/10" />
            <span className="text-text-muted text-[10px] font-black uppercase tracking-widest opacity-40">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-border-main/10" />
          </div>

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="w-full space-y-5" noValidate>
            <AnimatePresence mode="popLayout">
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 mb-2"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold leading-relaxed">{errors.general}</span>
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="status"
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-start gap-3 text-green-400 mb-2"
                >
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold leading-relaxed">{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label htmlFor="username" className="sr-only">{t('auth.anonymousJudgeHandle')}</label>
                    <div className="relative">
                      <UserIcon className={cn(
                        "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                        errors.username ? "text-red-500" : 
                        checkingUsername ? "text-text-muted" :
                        usernameChecked && usernameExists ? "text-red-500" : 
                        usernameChecked && !usernameExists ? "text-green-500" : "text-text-muted"
                      )} />
                      <input
                        id="username"
                        type="text"
                        placeholder={t('auth.anonymousJudgeHandle')}
                        required={isSignUp}
                        maxLength={12}
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); if (errors.username) setErrors(prev => ({ ...prev, username: '' })); }}
                        onBlur={() => handleBlur('username')}
                        aria-invalid={!!errors.username || (usernameChecked && usernameExists)}
                        aria-describedby={errors.username ? "username-error" : usernameChecked && username.length >= 5 ? "username-feedback" : undefined}
                        className={cn(
                          "w-full h-14 bg-card border rounded-2xl pl-14 pr-6 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
                          errors.username
                            ? "border-red-500/50 focus:ring-red-500/10"
                            : checkingUsername
                              ? "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                              : usernameChecked && usernameExists
                                ? "border-red-500/50 focus:ring-red-500/10"
                                : usernameChecked && !usernameExists
                                  ? "border-green-500/30 focus:ring-green-500/10"
                                  : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                        )}
                      />
                      {checkingUsername && (
                        <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
                      )}
                      {!checkingUsername && usernameChecked && username.length >= 5 && (
                        <CheckCircle className={cn(
                          "absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4",
                          usernameExists ? "text-red-500" : "text-green-500"
                        )} />
                      )}
                    </div>
                    {errors.username ? (
                      <p id="username-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
                        {errors.username}
                      </p>
                    ) : checkingUsername && username.length >= 5 ? (
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-2">
                        {t('validation.checkingUsername')}
                      </p>
                    ) : usernameChecked && username.length >= 5 && (
                      <p id="username-feedback" className={cn(
                        "text-[10px] font-bold uppercase tracking-widest pl-2",
                        usernameExists ? "text-red-500" : "text-green-500"
                      )}>
                        {usernameExists ? t('validation.usernameTaken') : t('validation.usernameAvailable')}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label htmlFor="email" className="sr-only">{t('auth.emailAddress')}</label>
                <div className="relative">
                  <Mail className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    errors.email ? "text-red-500" : "text-text-muted"
                  )} />
                  <input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailAddress')}
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                    onBlur={() => handleBlur('email')}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={cn(
                      "w-full h-14 bg-card border rounded-2xl pl-14 pr-6 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
                      errors.email
                        ? "border-red-500/50 focus:ring-red-500/10"
                        : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                    )}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="sr-only">{t('auth.secretPassword')}</label>
                <div className="relative">
                  <Lock className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    errors.password ? "text-red-500" : "text-text-muted"
                  )} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.secretPassword')}
                    required
                    autoComplete="off"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
                    onBlur={() => handleBlur('password')}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={cn(
                      "w-full h-14 bg-card border rounded-2xl pl-14 pr-12 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
                      errors.password
                        ? "border-red-500/50 focus:ring-red-500/10"
                        : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-primary active:text-primary/70 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 dark:text-white" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
                    {errors.password}
                  </p>
                )}
                {!isSignUp && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="self-end text-xs font-bold text-text-muted hover:text-primary underline-offset-2 transition-colors uppercase"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer group select-none self-start">
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
                        rememberMe
                          ? "bg-primary border-primary shadow-[0_0_12px_rgba(51,102,153,0.35)]"
                          : "border-border-main/30 bg-card group-hover:border-primary/50 group-hover:bg-primary/5"
                      )}>
                        {rememberMe && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-text-muted group-hover:text-primary transition-colors uppercase">
                        {t('auth.rememberMe')}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (isSignUp && usernameExists)}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110 hover:scale-[1.02] active:scale-95 focus:ring-4 focus:ring-primary/30 transition-all mt-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isSignUp ? t('auth.applyToTribunal') : t('auth.enterTribunal')
              )}
            </button>
          </form>

          {/* Footer */}
          <footer className="mt-10 text-center space-y-6">
            <button
              onClick={() => {
                if (isModal) {
                  setIsSignUp(!isSignUp);
                } else {
                  navigate(isSignUp ? '/login' : '/register');
                }
                setErrors({});
              }}
              className="text-text-muted text-xs font-bold hover:text-text-main hover:scale-105 active:scale-95 transition-all uppercase tracking-widest inline-block"
            >
              {isSignUp ? (
                <>{t('auth.alreadyJudge')} <span className="text-primary font-black underline underline-offset-4 ml-1">{t('auth.signIn')}</span></>
              ) : (
                <>{t('auth.firstTrial')} <span className="text-primary font-black underline underline-offset-4 ml-1">{t('auth.signUp')}</span></>
              )}
            </button>
          </footer>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
