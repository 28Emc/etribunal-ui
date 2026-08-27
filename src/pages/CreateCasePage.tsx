import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Image as ImageIcon, Link as LinkIcon, Copy, Check, Sparkles, Send, AlertCircle, Search, User, ShieldCheck } from 'lucide-react';
import { cn } from '@utils/helpers';
import type { Case, UserSearchResult } from '@typings/index';
import { useAuth } from '@context/AuthContext';
import { apiClient, authStorage } from '@api/client';
import { Tooltip } from '@components/ui/Tooltip';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';
import { useCases } from '@hooks/useCases';
import { getAnonymousAvatar } from '@services/anonymity';

export function CreateCasePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setCases } = useCases();
  const { currentUser } = useAuth();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [caseType, setCaseType] = useState<'vote' | 'classic'>('classic');
  const [story, setStory] = useState('');
  const [images, setImages] = useState<{ url: string, file: File }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; story?: string; sideB?: string; general?: string }>({});
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [submittedType, setSubmittedType] = useState<'vote' | 'classic' | null>(null);
  const [copied, setCopied] = useState(false);
  const [sideBQuery, setSideBQuery] = useState('');
  const [sideBResults, setSideBResults] = useState<UserSearchResult[]>([]);
  const [selectedSideB, setSelectedSideB] = useState<UserSearchResult | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [sideBInputFocused, setSideBInputFocused] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<UserSearchResult[]>([]);
  const [sideASubtitle, setSideASubtitle] = useState('');
  const [sideBSubtitle, setSideBSubtitle] = useState('');
  const [bothWrongSubtitle, setBothWrongSubtitle] = useState('');
  const globalAnon = currentUser?.is_anonymous ?? false;
  const [isAnonymous, setIsAnonymous] = useState(globalAnon);
  useEffect(() => {
    setSideASubtitle(t('cases.defaultSideA'));
    setSideBSubtitle(t('cases.defaultSideB'));
    setBothWrongSubtitle(t('cases.defaultBothWrong'));
  }, [t]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sideBInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  const fetchFollowingUsers = async () => {
    if (!authStorage.isAuthenticated()) return;
    try {
      const data = await apiClient.get<UserSearchResult[]>('/users/me/following?take=6');
      setFollowingUsers(data || []);
    } catch (error) {
      console.error('Error fetching following:', error);
      setFollowingUsers([]);
    }
  };

  useEffect(() => {
    if (caseType === 'vote' && authStorage.isAuthenticated()) {
      fetchFollowingUsers();
    }
  }, [caseType]);

  useEffect(() => {
    if (caseType !== 'vote' || !authStorage.isAuthenticated()) {
      setSideBResults([]);
      setIsSearchingUsers(false);
      return;
    }

    const normalizedQuery = sideBQuery.trim();
    
    if (sideBInputFocused && normalizedQuery.length === 0) {
      setSideBResults(followingUsers);
      return;
    }

    if (normalizedQuery.length < 2 || selectedSideB?.username === normalizedQuery) {
      setSideBResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const users = await apiClient.get<UserSearchResult[]>(
          `/users/search?q=${encodeURIComponent(normalizedQuery)}&take=6`,
        );
        setSideBResults(users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSideBResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [caseType, sideBQuery, selectedSideB, sideBInputFocused, followingUsers]);

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

  const validateField = (field: 'title' | 'story', value: string) => {
    switch (field) {
      case 'title':
        if (!value.trim()) return t('cases.titleRequired');
        if (value.length < 10) return t('cases.titleMinLength');
        if (value.length > 100) return t('cases.titleMaxLength');
        return '';
      case 'story':
        if (!value.trim()) return t('cases.storyRequired');
        if (value.length < 10) return t('cases.storyMinLength');
        if (value.length > 2000) return t('cases.storyMaxLength');
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: 'title' | 'story') => {
    const value = field === 'title' ? title : story;
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = () => {
    const newErrors = {
      title: validateField('title', title),
      story: validateField('story', story),
    };
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.values(newErrors).every(err => err === '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(prev => ({ ...prev, general: undefined }));

    if (!validateForm()) return;
    if (!authStorage.isAuthenticated()) return;

    setIsSubmitting(true);

    try {
      const uploadPromises = images.map(img => {
        const formData = new FormData();
        formData.append('file', img.file);
        return apiClient.postForm<{ url: string; public_id: string }>('/upload/image', formData);
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      const uploadedUrls = uploadResults.map(result => result.url);

      const createdCase = await apiClient.post<any>('/cases', {
        type: caseType,
        title,
        category,
        side_a_content: story,
        side_a_subtitle: sideASubtitle || t('cases.defaultSideA'),
        side_b_subtitle: sideBSubtitle || t('cases.defaultSideB'),
        both_wrong_subtitle: bothWrongSubtitle || t('cases.defaultBothWrong'),
        is_anonymous: isAnonymous,
        evidence_urls: uploadedUrls,
        side_b_user_id: caseType === 'vote' ? selectedSideB?.id : undefined,
      });

      const newCase: Case = {
        id: createdCase.id,
        title: createdCase.title,
        category,
        type: caseType,
        inviteToken: createdCase.invite_token || null,
        inviteUrl: createdCase.invite_url || null,
        sideA: {
          name: currentUser?.name || "You",
          avatar: currentUser?.avatar || "https://picsum.photos/seed/user123/100/100",
          story: createdCase.side_a_content,
          evidence: uploadedUrls.map((url, i) => ({ id: `e${i}`, url, caption: 'Evidence' }))
        },
        sideB: {
          name: selectedSideB?.username || t('cases.sideB') + "...",
          avatar: selectedSideB?.avatar_url || "https://picsum.photos/seed/waiting/100/100",
          story: t('cases.sideBNotResponded'),
          evidence: []
        },
        sideBUserId: selectedSideB?.id || null,
        votesA: 0,
        votesB: 0,
        votesBothWrong: 0,
        comments: [],
        tags: [category],
        createdAt: createdCase.created_at
      };

      setCases(prev => [newCase, ...prev]);

      if (caseType === 'classic') {
        setShareLink('__classic_success__');
        setSubmittedType('classic');
      } else {
        setShareLink(createdCase.invite_url || `${window.location.origin}/cases/${createdCase.invite_token}`);
        setSubmittedType('vote');
      }
    } catch (error: any) {
      console.error('Error creating case:', error);
      setErrors(prev => ({ ...prev, general: error?.message || 'Error de conexión. Verifica si tu backend corre sin problemas.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!currentUser) return null;

  return (
    <PageLayout title={t('cases.newCase')}>
      <SEO title={t('cases.createCase')} />
      <div className="flex-1 max-w-3xl mx-auto w-full px-3 md:px-4 py-6 space-y-10 pb-10 bg-card/50 rounded-[32px] border border-border-main/5">
        {!shareLink ? (
          <form onSubmit={handleSubmit} className="space-y-10" noValidate>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.theConflict')}</label>
                <span className={cn("text-[9px] font-bold uppercase", (title.length < 10 && title.length > 0) ? "text-secondary" : "text-text-muted/40")}>
                  {title.length}/100
                  {(title.length < 10) && " (Min 10)"}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
                onBlur={() => handleBlur('title')}
                maxLength={100}
                placeholder={t('cases.whatsTheDrama')}
                className={cn(
                  "w-full bg-transparent border-none p-0 text-xl md:text-3xl font-black italic uppercase tracking-tighter text-text-main placeholder:text-text-muted/20 focus:ring-0 focus:outline-none leading-[0.9] transition-colors rounded-lg",
                  errors.title ? "border-red-500/50" : ""
                )}
                autoFocus
              />
              {errors.title && (
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">{errors.title}</p>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.category')}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'Relationship', label: t('categories.relationship') },
                  { key: 'Friendship', label: t('categories.friendship') },
                  { key: 'Work', label: t('categories.work') },
                  { key: 'Family', label: t('categories.family') },
                  { key: 'Other', label: t('categories.other') }
                ].map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={cn(
                      "px-4 py-2 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all border",
                      category === cat.key
                        ? "bg-primary border-primary text-white"
                        : "bg-card border-border-main/10 text-text-muted hover:border-border-main/20"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={isAnonymous ? getAnonymousAvatar(currentUser?.id) : (currentUser?.avatar || "https://picsum.photos/seed/user123/100/100")} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main">
                    {t('cases.publishAs')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all",
                      !isAnonymous
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-text-muted/50 border-transparent"
                    )}>
                      {t('cases.userPublic')}
                    </span>
                    <span className="text-[8px] text-text-muted/30">|</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all",
                      isAnonymous
                        ? "bg-secondary/10 text-secondary border-secondary/30"
                        : "text-text-muted/50 border-transparent"
                    )}>
                      {t('cases.anonymous')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-all cursor-pointer",
                  isAnonymous ? "bg-secondary" : "bg-text-muted/20"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                  isAnonymous ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.caseType')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCaseType('classic');
                    setSideBQuery('');
                    setSideBResults([]);
                    setSelectedSideB(null);
                    setErrors(prev => ({ ...prev, sideB: '' }));
                  }}
                  className={cn(
                    "flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                    caseType === 'classic'
                      ? "bg-secondary/10 border-secondary"
                      : "bg-card border-border-main/10 hover:border-border-main/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className={cn("text-xs font-black uppercase tracking-widest", caseType === 'classic' ? "text-secondary" : "text-text-main")}>{t('cases.debate')}</span>
                  </div>
                  <p className="text-[10px] font-medium text-text-muted leading-relaxed">{t('cases.openDiscussion')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCaseType('vote')}
                  className={cn(
                    "flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                    caseType === 'vote'
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border-main/10 hover:border-border-main/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚖️</span>
                    <span className={cn("text-xs font-black uppercase tracking-widest", caseType === 'vote' ? "text-primary" : "text-text-main")}>{t('cases.vote')}</span>
                  </div>
                  <p className="text-[10px] font-medium text-text-muted leading-relaxed">{t('cases.publicJuryDecides')}</p>
                </button>
              </div>
            </div>
            {caseType === 'vote' && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.inviteSideBTitle')}</label>

                {selectedSideB ? (
                  <div className="bg-card border border-primary/20 rounded-[28px] p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
                        {selectedSideB.avatar_url ? (
                          <img src={selectedSideB.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-text-main truncate">@{selectedSideB.username}</p>
                        <p className="text-[11px] text-text-muted truncate">{selectedSideB.bio || t('cases.selectedSideB')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSideB(null);
                        setSideBQuery('');
                        setSideBResults([]);
                      }}
                      className="px-3 py-2 rounded-xl border border-border-main/10 text-[10px] font-black uppercase tracking-widest text-text-muted hover:border-border-main/20 hover:text-text-main transition-all"
                    >
                      {t('cases.change')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                        {t('cases.inviteReserved')}
                      </p>
                    </div>

                    <div className={cn(
                      "bg-card border rounded-[28px] px-5 py-4 flex items-center gap-3 transition-all",
                      errors.sideB ? "border-red-500/40" : "border-border-main/10 focus-within:border-primary/40"
                    )}>
                      <Search className="w-5 h-5 text-text-muted shrink-0" />
                      <input
                        ref={sideBInputRef}
                        type="text"
                        value={sideBQuery}
                        onChange={(e) => {
                          setSideBQuery(e.target.value);
                          if (errors.sideB) setErrors(prev => ({ ...prev, sideB: '' }));
                        }}
                        onFocus={() => setSideBInputFocused(true)}
                        onBlur={() => setTimeout(() => setSideBInputFocused(false), 200)}
                        placeholder={t('cases.searchByUsername')}
                        className="w-full bg-transparent text-sm font-semibold text-text-main placeholder:text-text-muted/40 focus:outline-none"
                      />
                    </div>

                    {errors.sideB && (
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{errors.sideB}</p>
                    )}

                    {sideBInputFocused && sideBQuery.trim().length === 0 && followingUsers.length > 0 && (
                      <div className="bg-card border border-border-main/10 rounded-[28px] overflow-hidden">
                        <div className="px-5 py-3 text-[9px] font-black uppercase tracking-widest text-text-muted border-b border-border-main/5 bg-primary/5">
                          {t('common.following')} · {followingUsers.length}
                        </div>
                        {followingUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedSideB(user);
                              setSideBQuery(user.username);
                              setSideBResults([]);
                              setSideBInputFocused(false);
                            }}
                            className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors border-b border-border-main/5 last:border-b-0"
                          >
                            <div className="w-11 h-11 rounded-full overflow-hidden border border-border-main/10 bg-border-main/5 flex items-center justify-center shrink-0">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-5 h-5 text-text-muted" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-text-main truncate">@{user.username}</p>
                              <p className="text-[11px] text-text-muted truncate">{user.bio || ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {sideBInputFocused && sideBQuery.trim().length >= 2 && (
                      <div className="bg-card border border-border-main/10 rounded-[28px] overflow-hidden">
                        {isSearchingUsers ? (
                          <div className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted">{t('cases.searchingUsers')}</div>
                        ) : sideBResults.length > 0 ? (
                          sideBResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setSelectedSideB(user);
                                setSideBQuery(user.username);
                                setSideBResults([]);
                              }}
                              className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors border-b border-border-main/5 last:border-b-0"
                            >
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-border-main/10 bg-border-main/5 flex items-center justify-center shrink-0">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <User className="w-5 h-5 text-text-muted" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-widest text-text-main truncate">@{user.username}</p>
                                <p className="text-[11px] text-text-muted truncate">{user.bio || t('cases.noBioAvailable')}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-5 py-4 text-[11px] font-bold text-text-muted">{t('cases.noUsersMatched')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.yourSideA')}</label>
                <span className={cn("text-[9px] font-bold uppercase", (story.length < 10 && story.length > 0) ? "text-secondary" : "text-text-muted/40")}>
                  {story.length}/2000
                  {(story.length < 10) && " (Min 10)"}
                </span>
              </div>
              <textarea
                value={story}
                onChange={(e) => { setStory(e.target.value); if (errors.story) setErrors(p => ({ ...p, story: '' })) }}
                onBlur={() => handleBlur('story')}
                maxLength={2000}
                placeholder={t('cases.tellYourStory')}
                className={cn(
                  "w-full bg-card border rounded-[32px] p-6 text-lg font-medium text-text-main leading-snug focus:outline-none transition-all min-h-[200px] resize-none placeholder:text-text-muted/40",
                  errors.story
                    ? "border-red-500/50 focus:ring-4 focus:ring-red-500/10"
                    : "border-border-main/10 focus:border-primary focus:ring-0"
                )}
              />
              {errors.story && (
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">{errors.story}</p>
              )}
            </div>

            {caseType === 'vote' && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.voteOptions')}</label>
                <p className="text-[10px] font-medium text-text-muted">{t('cases.voteOptionsHint')}</p>
                
                <div className="space-y-3">
                  <div className="bg-card border-2 border-primary/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(51,102,153,0.6)]"></span>
                      <span className="text-[10px] font-black uppercase text-primary">{t('cases.sideA')}</span>
                      <span className="text-[9px] text-text-muted/50 ml-auto">{sideASubtitle.length}/25</span>
                    </div>
                    <input
                      type="text"
                      value={sideASubtitle}
                      onChange={(e) => setSideASubtitle(e.target.value)}
                      maxLength={25}
                      placeholder={t('cases.defaultSideA')}
                      className="w-full bg-transparent text-sm font-semibold text-text-main placeholder:text-text-muted/40 focus:outline-none"
                    />
                  </div>

                  <div className="bg-card border-2 border-border-main/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-text-muted"></span>
                      <span className="text-[10px] font-black uppercase text-text-muted">{t('cases.bothWrong')}</span>
                      <span className="text-[9px] text-text-muted/50 ml-auto">{bothWrongSubtitle.length}/25</span>
                    </div>
                    <input
                      type="text"
                      value={bothWrongSubtitle}
                      onChange={(e) => setBothWrongSubtitle(e.target.value)}
                      maxLength={25}
                      placeholder={t('cases.defaultBothWrong')}
                      className="w-full bg-transparent text-sm font-semibold text-text-main placeholder:text-text-muted/40 focus:outline-none"
                    />
                  </div>

                  <div className="bg-card border-2 border-secondary/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_15px_rgba(255,102,0,0.6)]"></span>
                      <span className="text-[10px] font-black uppercase text-secondary">{t('cases.sideB')}</span>
                      <span className="text-[9px] text-text-muted/50 ml-auto">{sideBSubtitle.length}/25</span>
                    </div>
                    <input
                      type="text"
                      value={sideBSubtitle}
                      onChange={(e) => setSideBSubtitle(e.target.value)}
                      maxLength={25}
                      placeholder={t('cases.defaultSideB')}
                      className="w-full bg-transparent text-sm font-semibold text-text-main placeholder:text-text-muted/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('cases.evidenceLabel')}</label>
                <span className="text-[10px] font-bold text-text-muted uppercase">{images.length}/5 {t('cases.images')}</span>
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
                      className="absolute top-1 right-1 md:top-2 md:right-2 w-8 h-8 md:w-6 md:h-6 bg-black/60 md:bg-black/50 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-500"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </motion.div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-4/3 rounded-2xl border-2 border-dashed border-border-main/10 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-border-main/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                      <ImageIcon className="w-5 h-5 text-text-muted group-hover:text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted group-hover:text-primary">{t('cases.addEvidence')}</span>
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

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all text-sm font-black uppercase tracking-[0.2em]",
                isSubmitting
                  ? "bg-border-main/10 text-text-muted cursor-not-allowed"
                  : "bg-primary text-white hover:brightness-110 active:scale-95"
              )}
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {caseType === 'classic' ? t('cases.openForDebate') : t('cases.letJuryDecide')}
                </>
              )}
            </button>

            <AnimatePresence mode="popLayout">
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 mt-4"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold leading-relaxed">{errors.general}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        ) : (
          submittedType === 'classic' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-8 text-center"
            >
              <div className="w-24 h-24 bg-secondary/20 rounded-[40px] flex items-center justify-center border-2 border-secondary/30">
                <span className="text-5xl">💬</span>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-text-main">{t('cases.debateIsLive')}</h2>
                <p className="text-text-muted font-medium">{t('cases.casePublic')}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-10 text-center"
            >
              <div className="w-24 h-24 bg-primary/20 rounded-[40px] flex items-center justify-center border-2 border-primary/30">
                <Sparkles className="w-12 h-12 text-primary animate-pulse" />
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-text-main">{t('cases.caseFiled')}</h2>
                <p className="text-text-muted font-medium">
                  {selectedSideB
                    ? t('cases.sendInviteToUser', { username: selectedSideB.username })
                    : t('cases.sendInviteGeneric')}
                </p>
              </div>

              <div className="w-full space-y-4">
                <div className="w-full bg-card border border-border-main/10 rounded-[32px] p-6 flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <LinkIcon className="w-6 h-6 text-primary shrink-0" />
                    <span className="text-sm font-bold text-text-main truncate">{shareLink}</span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all active:scale-90 shrink-0 ml-2"
                  >
                    {copied ? <Check className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6 text-primary" />}
                  </button>
                </div>

                <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10 text-left">
                  <span className="text-lg">⚖️</span>
                  <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                    {t('cases.waitingForSideBVoting', { username: selectedSideB ? `@${selectedSideB.username}` : t('cases.otherSidePending') })}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        )}
      </div>
    </PageLayout>
  );
}
