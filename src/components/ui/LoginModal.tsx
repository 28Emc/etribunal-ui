import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Globe, Apple, MessageCircle, User as UserIcon, AlertCircle, X, Loader2, CheckCircle, Eye, EyeOff, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { User } from '@typings/index';
import { apiClient, authStorage } from '@api/client';
import { useAuth } from '@context/AuthContext';
import { cn } from '@utils/helpers';
import { useDebounce } from '@hooks/useDebounce';
import { useTheme } from '@hooks/useTheme';

interface LoginProps {
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

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function validateEmail(value: string, isSignUp: boolean, t: TFunction): string {
  if (!value) return t('auth.emailRequired');
  if (isSignUp && !EMAIL_REGEX.test(value)) return t('auth.validEmail');
  return '';
}

function validatePassword(value: string, t: TFunction): string {
  if (!value) return t('auth.passwordRequired');
  if (value.length < 8) return t('auth.passwordMinLength');
  if (!PASSWORD_REGEX.test(value)) return t('auth.passwordRequirements');
  return '';
}

function validateUsername(value: string, isSignUp: boolean, t: TFunction): string {
  if (!isSignUp) return '';
  if (!value.trim()) return t('auth.usernameRequired');
  if (value.length < 5) return t('auth.usernameMinLength');
  if (value.length > 12) return t('auth.usernameMaxLength');
  return '';
}

function validateField(name: string, value: string, isSignUp: boolean, t: TFunction): string {
  switch (name) {
    case 'email':
      return validateEmail(value, isSignUp, t);
    case 'password':
      return validatePassword(value, t);
    case 'username':
      return validateUsername(value, isSignUp, t);
    default:
      return '';
  }
}

interface UsernameState {
  iconClass: string;
  borderClass: string;
  describedBy?: string;
}

function getUsernameState(
  errors: FormErrors,
  checking: boolean,
  checked: boolean,
  exists: boolean,
  value: string
): UsernameState {
  let iconClass = 'text-text-muted';
  if (errors.username || (checked && exists)) {
    iconClass = 'text-red-500';
  } else if (checked && !exists) {
    iconClass = 'text-green-500';
  }

  let borderClass = 'border-border-main/10 focus:border-primary/50 focus:ring-primary/10';
  if (errors.username || (checked && exists)) {
    borderClass = 'border-red-500/50 focus:ring-red-500/10';
  } else if (checked && !exists) {
    borderClass = 'border-green-500/30 focus:ring-green-500/10';
  }

  let describedBy: string | undefined;
  if (errors.username) {
    describedBy = 'username-error';
  } else if (checked && value.length >= 5) {
    describedBy = 'username-feedback';
  }

  return { iconClass, borderClass, describedBy };
}

function mapAuthUser(data: any): User {
  return {
    id: data.id,
    name: data.username,
    username: data.username,
    email: data.email,
    avatar: data.avatar_url || data.avatarUrl || data.avatar || `https://picsum.photos/seed/${data.id}/200`,
    hasPassword: data.hasPassword || data.password_hash,
    casesCreated: [],
    votes: data.votes || {},
    role: data.role,
  };
}

type AuthResult =
  | { status: 'success'; user: User }
  | { status: 'verification_required' }
  | { status: 'error'; message: string };

async function performRegister(
  values: { username: string; email: string; password: string; language?: string },
  t: TFunction
): Promise<AuthResult> {
  const data = await apiClient.post('/auth/register', values) as any;

  const userData = data.user || data.data?.user || data;
  const needsEmailVerification = data.email_verification_required ?? data.data?.email_verification_required;

  if (needsEmailVerification) {
    return { status: 'verification_required' };
  }

  if (!userData?.id) {
    return { status: 'error', message: t('auth.authError') };
  }

  authStorage.setTokens(
    data.access_token || data.data?.access_token,
    data.refresh_token || data.data?.refresh_token
  );

  return { status: 'success', user: mapAuthUser(userData) };
}

async function performLogin(
  values: { email: string; password: string },
  rememberMe: boolean
): Promise<AuthResult> {
  const data = await apiClient.post('/auth/login', values) as any;

  const userData = data.user || data.data?.user;
  const accessToken = data.access_token || data.data?.access_token;

  if (accessToken) {
    authStorage.setTokens(accessToken, data.refresh_token || data.data?.refresh_token, rememberMe);
  }

  return { status: 'success', user: mapAuthUser(userData) };
}

function formatAuthError(err: any, t: TFunction): string {
  const message: string = err?.message || '';
  if (err?.status === 429) {
    return message.startsWith('ThrottlerException') ? t('auth.tooManyAttempts') : message;
  }
  if (message.startsWith('SOCIAL_AUTH_REQUIRED:')) {
    const provider = message.split(':')[1];
    const formattedProvider = provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
    return t('auth.socialAccountError', { provider: formattedProvider });
  }
  return message || t('auth.authError');
}

function SuccessOverlay({ onComplete }: Readonly<{ onComplete: () => void }>) {
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

type SocialProvider = 'google' | 'apple' | 'facebook';

function SocialLoginButtons({ onProvider }: Readonly<{ onProvider: (provider: SocialProvider) => void }>) {
  const { t } = useTranslation();

  return (
    <section className="w-full mb-10 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-6 opacity-40">{t('auth.continueWith')}</p>
      <div className="grid grid-cols-3 gap-3 w-full" aria-label="Social login options">
        <button
          onClick={() => onProvider('google')}
          className="group flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg overflow-hidden"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#f44242]" />
          </div>
          <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-[#000000]">Google</span>
        </button>

        <button
          onClick={() => onProvider('apple')}
          className="group flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-black rounded-2xl border border-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg overflow-hidden"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <Apple className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-white">Apple</span>
        </button>

        <button
          onClick={() => onProvider('facebook')}
          className="group flex flex-col sm:flex-row items-center justify-center gap-2 py-4 bg-[#FFFFFF] rounded-2xl border border-[#1877F2]/20 hover:scale-105 active:scale-95 transition-all shadow-lg overflow-hidden"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#1877F2] fill-current" />
          </div>
          <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-[#1877F2]">Facebook</span>
        </button>
      </div>
    </section>
  );
}

interface UsernameFieldProps {
  value: string;
  error?: string;
  checking: boolean;
  checked: boolean;
  exists: boolean;
  iconClass: string;
  borderClass: string;
  describedBy?: string;
  t: TFunction;
  onValueChange: (value: string) => void;
  onBlur: () => void;
}

function UsernameField({ value, error, checking, checked, exists, iconClass, borderClass, describedBy, t, onValueChange, onBlur }: Readonly<UsernameFieldProps>) {
  return (
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
          iconClass
        )} />
        <input
          id="username"
          type="text"
          placeholder={t('auth.anonymousJudgeHandle')}
          required
          maxLength={12}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error || (checked && exists)}
          aria-describedby={describedBy}
          className={cn(
            "w-full h-14 bg-card border rounded-2xl pl-14 pr-6 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
            borderClass
          )}
        />
        {checking && (
          <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
        )}
        {!checking && checked && value.length >= 5 && (
          <CheckCircle className={cn(
            "absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4",
            exists ? "text-red-500" : "text-green-500"
          )} />
        )}
      </div>
      {error && (
        <p id="username-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
          {error}
        </p>
      )}
      {!error && checking && value.length >= 5 && (
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-2">
          {t('validation.checkingUsername')}
        </p>
      )}
      {!error && !checking && checked && value.length >= 5 && (
        <p id="username-feedback" className={cn(
          "text-[10px] font-bold uppercase tracking-widest pl-2",
          exists ? "text-red-500" : "text-green-500"
        )}>
          {exists ? t('validation.usernameTaken') : t('validation.usernameAvailable')}
        </p>
      )}
    </motion.div>
  );
}

interface FieldProps {
  value: string;
  error?: string;
  t: TFunction;
  onValueChange: (value: string) => void;
  onBlur: () => void;
}

function EmailField({ value, error, t, onValueChange, onBlur }: Readonly<FieldProps>) {
  return (
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
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={onBlur}
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
  );
}

interface PasswordFieldProps {
  value: string;
  error?: string;
  showPassword: boolean;
  rememberMe: boolean;
  isSignUp: boolean;
  t: TFunction;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  onToggleShow: () => void;
  onToggleRemember: (checked: boolean) => void;
}

function PasswordField({ value, error, showPassword, rememberMe, isSignUp, t, onValueChange, onBlur, onToggleShow, onToggleRemember }: Readonly<PasswordFieldProps>) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <label htmlFor="password" className="sr-only">{t('auth.secretPassword')}</label>
      <div className="relative">
        <Lock className={cn(
          "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
          error ? "text-red-500" : "text-text-muted"
        )} />
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder={t('auth.secretPassword')}
          required
          autoComplete="off"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? "password-error" : undefined}
          className={cn(
            "w-full h-14 bg-card border rounded-2xl pl-14 pr-12 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all",
            error
              ? "border-red-500/50 focus:ring-red-500/10"
              : "border-border-main/10 focus:border-primary/50 focus:ring-primary/10"
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
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
      {error && (
        <p id="password-error" className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2" role="alert">
          {error}
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
              onChange={(e) => onToggleRemember(e.target.checked)}
              className="sr-only"
            />
            <span className="text-xs font-bold text-text-muted group-hover:text-primary transition-colors uppercase">
              {t('auth.rememberMe')}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function GeneralError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        role="alert"
        className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 mb-2"
      >
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <span className="text-xs font-bold leading-relaxed">{message}</span>
      </motion.div>
    </AnimatePresence>
  );
}

interface AuthFooterProps {
  isSignUp: boolean;
  isModal: boolean;
  t: TFunction;
  onToggle: () => void;
}

function AuthFooter({ isSignUp, isModal, t, onToggle }: Readonly<AuthFooterProps>) {
  return (
    <footer className="mt-10 text-center space-y-6">
      <button
        onClick={onToggle}
        className="text-text-muted text-xs font-bold hover:text-text-main hover:scale-105 active:scale-95 transition-all uppercase tracking-widest inline-block"
      >
        {isSignUp ? (
          <>{t('auth.alreadyJudge')} <span className="text-primary font-black underline underline-offset-4 ml-1">{t('auth.signIn')}</span></>
        ) : (
          <>{t('auth.firstTrial')} <span className="text-primary font-black underline underline-offset-4 ml-1">{t('auth.signUp')}</span></>
        )}
      </button>
    </footer>
  );
}

function useCredentialChecks(email: string, username: string, isSignUp: boolean): {
  emailExists: boolean;
  usernameExists: boolean;
  usernameChecked: boolean;
  checkingUsername: boolean;
} {
  const [emailExists, setEmailExists] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const debouncedEmail = useDebounce(email, 1000);
  const debouncedUsername = useDebounce(username, 1000);

  useEffect(() => {
    const checkEmailExistence = async () => {
      if (!isSignUp || !debouncedEmail || debouncedEmail.length < 5) {
        setEmailExists(false);
        return;
      }
      if (!EMAIL_REGEX.test(debouncedEmail)) {
        setEmailExists(false);
        return;
      }

      try {
        const result = await apiClient.get(
          `/auth/check-existence?email=${encodeURIComponent(debouncedEmail)}`
        ) as { emailExists: boolean };
        setEmailExists(result.emailExists);
      } catch {
        setEmailExists(false);
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

  return { emailExists, usernameExists, usernameChecked, checkingUsername };
}

interface AuthFormResult {
  email: string;
  password: string;
  username: string;
  isSignUp: boolean;
  loading: boolean;
  errors: FormErrors;
  emailExists: boolean;
  usernameExists: boolean;
  usernameChecked: boolean;
  checkingUsername: boolean;
  showPassword: boolean;
  rememberMe: boolean;
  showSuccessOverlay: boolean;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  handleBlur: (field: keyof FormErrors) => void;
  clearFieldError: (field: keyof FormErrors) => void;
  handleAuth: (e: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
  handleSocialLogin: (provider: SocialProvider) => void;
  toggleMode: () => void;
  requestClose: () => void;
  closeSuccessOverlay: () => void;
  toggleShowPassword: () => void;
  toggleRememberMe: (checked: boolean) => void;
  usernameState: UsernameState;
  actionLabel: string;
  isSubmitDisabled: boolean;
}

function useAuthForm(props: LoginProps): AuthFormResult {
  const { isModal = false, onClose, onLoginSuccess, initialIsSignUp = false } = props;
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);

  useEffect(() => {
    if (isModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isModal]);

  useEffect(() => {
    setIsSignUp(initialIsSignUp);
  }, [initialIsSignUp]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { emailExists, usernameExists, usernameChecked, checkingUsername } = useCredentialChecks(email, username, isSignUp);

  const handleBlur = (field: keyof FormErrors) => {
    let value: string;
    if (field === 'email') {
      value = email;
    } else if (field === 'password') {
      value = password;
    } else {
      value = username;
    }
    const error = validateField(field, value, isSignUp, t);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const clearFieldError = (field: keyof FormErrors) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateField('email', email, isSignUp, t),
      password: validateField('password', password, isSignUp, t),
      username: isSignUp ? validateField('username', username, isSignUp, t) : '',
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
  };

  const handleAuth = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = isSignUp
        ? await performRegister({ username, email, password, language: i18n.language }, t)
        : await performLogin({ email, password }, rememberMe);

      if (result.status === 'success') {
        handleAuthSuccess(result.user);
      } else if (result.status === 'verification_required') {
        setEmail('');
        setPassword('');
        setUsername('');
        setShowSuccessOverlay(true);
        setTimeout(() => {
          setShowSuccessOverlay(false);
          setIsSignUp(false);
        }, 3000);
      } else {
        setErrors({ general: result.message });
      }
    } catch (err: any) {
      setErrors({ general: formatAuthError(err, t) });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
    window.location.href = `${baseUrl}/auth/${provider}`;
  };

  const toggleMode = () => {
    if (isModal) {
      setIsSignUp(!isSignUp);
    } else {
      navigate(isSignUp ? '/login' : '/register');
    }
    setErrors({});
  };

  const requestClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  const closeSuccessOverlay = () => {
    setShowSuccessOverlay(false);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleRememberMe = (checked: boolean) => {
    setRememberMe(checked);
  };

  const usernameState = getUsernameState(errors, checkingUsername, usernameChecked, usernameExists, username);
  const actionLabel = isSignUp ? t('auth.applyToTribunal') : t('auth.enterTribunal');
  const isSubmitDisabled = loading || (isSignUp && (usernameExists || emailExists));

  return {
    email,
    password,
    username,
    isSignUp,
    loading,
    errors,
    emailExists,
    usernameExists,
    usernameChecked,
    checkingUsername,
    showPassword,
    rememberMe,
    showSuccessOverlay,
    setEmail,
    setPassword,
    setUsername,
    handleBlur,
    clearFieldError,
    handleAuth,
    handleSocialLogin,
    toggleMode,
    requestClose,
    closeSuccessOverlay,
    toggleShowPassword,
    toggleRememberMe,
    usernameState,
    actionLabel,
    isSubmitDisabled,
  };
}

export const Login: React.FC<LoginProps> = (props: LoginProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isModal = false } = props;

  const {
    email,
    password,
    username,
    isSignUp,
    loading,
    errors,
    usernameChecked,
    checkingUsername,
    usernameExists,
    showPassword,
    rememberMe,
    showSuccessOverlay,
    setEmail,
    setPassword,
    setUsername,
    handleBlur,
    clearFieldError,
    handleAuth,
    handleSocialLogin,
    toggleMode,
    requestClose,
    closeSuccessOverlay,
    toggleShowPassword,
    toggleRememberMe,
    usernameState,
    actionLabel,
    isSubmitDisabled,
  } = useAuthForm(props);

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
          <SuccessOverlay onComplete={closeSuccessOverlay} />
        </motion.div>
      )}

      <button
        onClick={requestClose}
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
              src={theme === 'dark' ? '/icons/eTribunal-isotipo-bn.png' : '/icons/eTribunal-isotipo.png'}
              alt="eTribunal"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mb-6"
            />
            <h1 id="login-title" className="text-3xl font-black italic tracking-tighter text-text-main mb-2">eTribunal</h1>
            <p className="text-text-muted font-bold tracking-[.25em] uppercase text-[10px] opacity-60">{t('auth.twoSidesOneVerdict')}</p>
          </div>

          {/* Social Logins */}
          <SocialLoginButtons onProvider={handleSocialLogin} />

          {/* Divider */}
          <div className="w-full flex items-center gap-4 mb-8" aria-hidden="true">
            <div className="flex-1 h-px bg-border-main/10" />
            <span className="text-text-muted text-[10px] font-black uppercase tracking-widest opacity-40">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-border-main/10" />
          </div>

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="w-full space-y-5" noValidate>
            <GeneralError message={errors.general} />

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {isSignUp && (
                  <UsernameField
                    value={username}
                    error={errors.username}
                    checking={checkingUsername}
                    checked={usernameChecked}
                    exists={usernameExists}
                    iconClass={usernameState.iconClass}
                    borderClass={usernameState.borderClass}
                    describedBy={usernameState.describedBy}
                    t={t}
                    onValueChange={(value) => { setUsername(value); if (errors.username) clearFieldError('username'); }}
                    onBlur={() => handleBlur('username')}
                  />
                )}
              </AnimatePresence>

              <EmailField
                value={email}
                error={errors.email}
                t={t}
                onValueChange={(value) => { setEmail(value); if (errors.email) clearFieldError('email'); }}
                onBlur={() => handleBlur('email')}
              />

              <PasswordField
                value={password}
                error={errors.password}
                showPassword={showPassword}
                rememberMe={rememberMe}
                isSignUp={isSignUp}
                t={t}
                onValueChange={(value) => { setPassword(value); if (errors.password) clearFieldError('password'); }}
                onBlur={() => handleBlur('password')}
                onToggleShow={toggleShowPassword}
                onToggleRemember={toggleRememberMe}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110 hover:scale-[1.02] active:scale-95 focus:ring-4 focus:ring-primary/30 transition-all mt-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                actionLabel
              )}
            </button>
          </form>

          {/* Footer */}
          <AuthFooter isSignUp={isSignUp} isModal={isModal} t={t} onToggle={toggleMode} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};