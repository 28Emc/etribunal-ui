import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  User, LogOut, Bell, Moon, Shield, Trash2, FileText, Lock, Users, HelpCircle, Info, Sun, Check, AlertCircle, Loader2, Globe, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@utils/helpers';
import { useAuth } from '@context/AuthContext';
import { useTranslation } from 'react-i18next';
import { SectionTitle } from '@components/ui/SectionTitle';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@shared/components/SEO';
import { DeleteAccountModal } from '@components/ui/DeleteAccountModal';
import { apiClient } from '@api/client';

export const SettingsPage: React.FC = () => {
  const { currentUser: user, updateProfile, changePassword, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('etribunal_receive_notifications') !== 'false';
  });
  const [anonymous, setAnonymous] = useState(user?.is_anonymous || false);
  const [language, setLanguage] = useState(user?.language || 'es');
  const [languageDropdown, setLanguageDropdown] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState(user?.bio || '');
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [showSupportInfo, setShowSupportInfo] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('etribunal_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (i18n.language) setLanguage(i18n.language);
  }, [i18n.language]);

  const onThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('etribunal_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLanguageChange = async (newLang: string) => {
    setLanguage(newLang);
    setLanguageDropdown(false);
    i18n.changeLanguage(newLang);
    try {
      await apiClient.patch('/users/profile/me', { language: newLang });
    } catch (err) {
      console.error('Error updating language:', err);
    }
  };

  const handleAnonymousToggle = async () => {
    const newValue = !anonymous;
    setAnonymous(newValue);
    try {
      await apiClient.patch('/users/profile/me', { is_anonymous: newValue });
    } catch (err) {
      console.error('Error updating anonymous mode:', err);
    }
  };

  const handleNotificationsToggle = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem('etribunal_receive_notifications', String(newValue));
  };

  if (!user) return null;

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === user.name) {
      setIsEditingName(false);
      return;
    }
    if (trimmed.length < 5 || trimmed.length > 60) {
      setError(t('settings.usernameLengthError'));
      return;
    }

    setIsUpdating(true);
    setError(null);
    try {
      await updateProfile({ name: trimmed });
      setIsEditingName(false);
    } catch (err: any) {
      setError(err.message || t('settings.updateUsernameError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveBio = async () => {
    const trimmed = newBio.trim();
    if (trimmed === (user.bio || '')) {
      setIsEditingBio(false);
      return;
    }
    if (trimmed.length > 255) {
      setError(t('settings.bioLengthError'));
      return;
    }

    setIsUpdating(true);
    setError(null);
    try {
      await updateProfile({ bio: trimmed });
      setIsEditingBio(false);
    } catch (err: any) {
      setError(err.message || t('settings.updateBioError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePassword = async () => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError(t('settings.passwordComplexityError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordsMismatch'));
      return;
    }

    setIsUpdating(true);
    setError(null);
    setPassSuccess(false);
    try {
      await changePassword(currentPassword, newPassword);
      setPassSuccess(true);
      setTimeout(() => {
        setIsEditingPassword(false);
        setPassSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('settings.changePasswordError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SettingRow = ({ icon: Icon, label, value, onClick, isToggle, toggleValue, onToggle, isDanger }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-5 bg-card border border-border-main/5 rounded-[28px] transition-all hover:scale-[1.02] active:scale-[0.98] group min-h-[60px]",
        isDanger ? "hover:bg-secondary/5 active:bg-secondary/10 hover:border-secondary/30 active:border-secondary/50" : "hover:bg-primary/5 active:bg-primary/10 hover:border-primary/30 active:border-primary/50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
          isDanger
            ? "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white group-active:bg-secondary group-active:text-white"
            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-active:bg-primary group-active:text-white"
        )}>
          <Icon className="w-5 h-5 transition-transform group-hover:scale-110 group-active:scale-110" />
        </div>
        <span className={cn(
          "text-sm font-black uppercase tracking-widest transition-colors",
          isDanger ? "text-secondary" : "text-text-main group-hover:text-primary group-active:text-primary"
        )}>
          {label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {value && <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{value}</span>}
        {isToggle ? (
          <div
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={cn(
              "w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer min-w-[48px] min-h-[24px]",
              toggleValue ? "bg-primary shadow-[0_0_10px_rgba(51,102,153,0.4)]" : "bg-border-main/20"
            )}
          >
            <motion.div
              animate={{ x: toggleValue ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-4 h-4 bg-white rounded-full shadow-lg"
            />
          </div>
        ) : (
          <div className={cn("w-5 h-5 transition-transform group-hover:translate-x-1 group-active:translate-x-1 flex items-center justify-center", isDanger ? "text-secondary/50" : "text-text-muted")}>&gt;</div>
        )}
      </div>
    </button>
  );

  return (
    <PageLayout title={t('settings.settings')}>
      <SEO title={t('profile.settings')} />
      <div className="flex-1 py-3 sm:py-6 space-y-10 pb-32">
        <section>
          <SectionTitle>{t('settings.account')}</SectionTitle>
          <div className="space-y-3">
            {isEditingName ? (
              <div className="w-full p-5 bg-card border border-primary/30 rounded-[28px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-2 italic">{t('settings.newIdentity')}</span>
                  <button onClick={() => { setIsEditingName(false); setError(null); }} className="text-text-muted hover:text-text-main transition-colors">x</button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('settings.enterUsername')}
                    maxLength={12}
                    className={cn(
                      "w-full bg-border-main/5 border border-border-main/10 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-widest text-text-main focus:outline-none transition-all pr-16",
                      error ? "border-secondary/50 focus:border-secondary" : "focus:border-primary"
                    )}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className={cn("text-[9px] font-bold", newName.length < 5 ? "text-secondary" : "text-text-muted/30")}>
                      {newName.length}/12
                    </span>
                    <User className="w-4 h-4 text-text-muted/30" />
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 px-2 text-secondary">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{error}</span>
                  </div>
                )}
                <button
                  onClick={handleSaveName}
                  disabled={isUpdating || !newName.trim() || newName === user.name || newName.length < 5}
                  className={cn(
                    "w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95",
                    isUpdating || !newName.trim() || newName === user.name || newName.length < 5
                      ? "bg-border-main/10 text-text-muted cursor-not-allowed"
                      : "bg-primary text-white shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110"
                  )}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />{t('settings.saveNewIdentity')}</>}
                </button>
              </div>
            ) : (
              <SettingRow icon={User} label={t('settings.editUsername')} value={user.name} onClick={() => setIsEditingName(true)} />
            )}

            {isEditingBio ? (
              <div className="w-full p-5 bg-card border border-primary/30 rounded-[28px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-2 italic">{t('settings.yourBio')}</span>
                  <button onClick={() => { setIsEditingBio(false); setError(null); }} className="text-text-muted hover:text-text-main transition-colors">x</button>
                </div>
                <div className="relative">
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    placeholder={t('settings.tellWhoYouAre')}
                    maxLength={255}
                    className={cn(
                      "w-full bg-border-main/5 border border-border-main/10 rounded-2xl px-5 py-4 text-sm font-medium text-text-main focus:outline-none transition-all min-h-[100px] resize-none",
                      error ? "border-secondary/50 focus:border-secondary" : "focus:border-primary"
                    )}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSaveBio}
                  disabled={isUpdating || newBio === (user.bio || '')}
                  className={cn(
                    "w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95",
                    isUpdating || newBio === (user.bio || '')
                      ? "bg-border-main/10 text-text-muted cursor-not-allowed"
                      : "bg-primary text-white shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110"
                  )}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />{t('settings.updateBio')}</>}
                </button>
              </div>
            ) : (
              <SettingRow icon={FileText} label={t('settings.editBio')} value={user.bio ? (user.bio.length > 20 ? user.bio.substring(0, 20) + '...' : user.bio) : t('settings.addBio')} onClick={() => setIsEditingBio(true)} />
            )}

            {user.hasPassword && (
              isEditingPassword ? (
                <div className="w-full p-5 bg-card border border-primary/30 rounded-[28px] space-y-4">
                   <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-2 italic">{t('settings.updateSecurity')}</span>
                    <button onClick={() => { setIsEditingPassword(false); setError(null); }} className="text-text-muted hover:text-text-main transition-colors">x</button>
                  </div>
                  {passSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-4 text-primary">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Check className="w-8 h-8" /></div>
                      <span className="text-xs font-black uppercase tracking-widest italic">{t('settings.passwordUpdated')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="relative">
                          <input type={showCurrentPassword ? 'text' : 'password'} autoComplete="off" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('settings.currentPassword')} className="w-full bg-border-main/5 border border-border-main/10 rounded-2xl px-5 py-4 pr-12 text-sm font-medium text-text-main focus:outline-none focus:border-primary transition-all" />
                          <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                            {showCurrentPassword ? <EyeOff className="w-4 h-4 dark:text-white" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <input type={showNewPassword ? 'text' : 'password'} autoComplete="off" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.newPassword')} className="w-full bg-border-main/5 border border-border-main/10 rounded-2xl px-5 py-4 pr-12 text-sm font-medium text-text-main focus:outline-none focus:border-primary transition-all" />
                          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                            {showNewPassword ? <EyeOff className="w-4 h-4 dark:text-white" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <input type={showConfirmPassword ? 'text' : 'password'} autoComplete="off" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmNewPassword')} className="w-full bg-border-main/5 border border-border-main/10 rounded-2xl px-5 py-4 pr-12 text-sm font-medium text-text-main focus:outline-none focus:border-primary transition-all" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4 dark:text-white" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {error && (
                        <div className="flex items-start gap-2 px-2 text-secondary">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest leading-relaxed">{error}</span>
                        </div>
                      )}
                      <button
                        onClick={handleSavePassword}
                        disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
                        className={cn(
                          "w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95",
                          isUpdating || !currentPassword || !newPassword || !confirmPassword
                            ? "bg-border-main/10 text-text-muted cursor-not-allowed"
                            : "bg-primary text-white shadow-[0_10px_20px_rgba(51,102,153,0.3)] hover:brightness-110"
                        )}
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.saveNewPassword')}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <SettingRow icon={Lock} label={t('settings.changePassword')} onClick={() => setIsEditingPassword(true)} />
              )
            )}
            <SettingRow icon={LogOut} label={t('settings.logOut')} onClick={handleLogout} />
          </div>
        </section>

        <section>
          <SectionTitle>{t('settings.preferences')}</SectionTitle>
          <div className="space-y-3">
            <div className="relative">
              <button
                onClick={() => setLanguageDropdown(!languageDropdown)}
                className="w-full flex items-center justify-between p-5 bg-card border border-border-main/5 rounded-[28px] transition-all hover:scale-[1.02] active:scale-[0.98] group hover:bg-primary/5 hover:border-primary/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm group-hover:shadow-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white">
                    <Globe className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest transition-colors text-text-main group-hover:text-primary">
                    {t('settings.language')}
                  </span>
                </div>
                <div className={cn("transition-transform", languageDropdown && "rotate-180")}>v</div>
              </button>
              {languageDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-card border border-border-main/5 rounded-2xl overflow-hidden">
                  {[
                    { code: 'es', label: 'Español', flag: '🇪🇸' },
                    { code: 'en', label: 'English', flag: '🇺🇸' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-3 text-left hover:bg-primary/5 transition-colors",
                        language === lang.code && "bg-primary/10"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-sm font-semibold text-text-main">{lang.label}</span>
                      </span>
                      {language === lang.code && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <SettingRow icon={Bell} label={t('settings.notifications')} isToggle toggleValue={notifications} onToggle={handleNotificationsToggle} />
            <SettingRow icon={theme === 'dark' ? Moon : Sun} label={t('settings.theme')} value={theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')} isToggle toggleValue={theme === 'dark'} onToggle={onThemeToggle} />
          </div>
        </section>

        <section>
          <SectionTitle>{t('settings.privacy')}</SectionTitle>
          <div className="space-y-3">
            <SettingRow icon={Shield} label={t('settings.anonymousMode')} isToggle toggleValue={anonymous} onToggle={handleAnonymousToggle} />
            <SettingRow icon={Trash2} label={t('settings.deleteAccount')} isDanger onClick={() => setShowDeleteAccount(true)} />
          </div>
        </section>

        <section>
          <SectionTitle>{t('settings.legal')}</SectionTitle>
          <div className="space-y-3">
            <SettingRow icon={FileText} label={t('settings.termsConditions')} onClick={() => navigate('/legal/terms')} />
            <SettingRow icon={Lock} label={t('settings.privacyPolicy')} onClick={() => navigate('/legal/privacy')} />
            <SettingRow icon={Users} label={t('settings.communityGuidelines')} onClick={() => navigate('/legal/guidelines')} />
          </div>
        </section>

        <section>
          <SectionTitle>{t('settings.other')}</SectionTitle>
          <div className="space-y-3">
            <SettingRow icon={HelpCircle} label={t('settings.contactSupport')} onClick={() => setShowSupportInfo(!showSupportInfo)} />
            {showSupportInfo && (
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-[28px] space-y-4 mb-3">
                <div className="flex items-center gap-3 text-primary">
                  <Info className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">{t('settings.supportCenter')}</span>
                </div>
                <p className="text-xs font-medium text-text-main leading-relaxed">
                  {t('settings.needHelp')} <a href="mailto:support@etribunal.app" className="text-primary font-black underline decoration-2 underline-offset-4">support@etribunal.app</a>.
                </p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t('settings.inquiriesResolved')}</p>
              </div>
            )}
            <div className="flex items-center justify-between p-5 bg-card border border-border-main/5 rounded-[28px]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-border-main/10 text-text-muted flex items-center justify-center"><Info className="w-5 h-5" /></div>
                <span className="text-sm font-black uppercase tracking-widest text-text-muted">{t('settings.appVersion')}</span>
              </div>
              <span className="text-[10px] font-black text-text-muted/60 uppercase tracking-widest bg-border-main/5 px-3 py-1 rounded-full border border-border-main/10">v1.0.4 (Build 82)</span>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showDeleteAccount && (
          <DeleteAccountModal isOpen={showDeleteAccount} username={user?.name || ''} onClose={() => setShowDeleteAccount(false)} onConfirm={() => {}} />
        )}
      </AnimatePresence>
    </PageLayout>
  );
};
