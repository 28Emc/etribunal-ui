import { useState, useCallback } from 'react';
import i18n from '../services/i18n';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://etribunal.app';

export type ShareType = 'case' | 'profile' | 'comment';

export interface ShareData {
  type: ShareType;
  id: string;
  title?: string;
  username?: string;
  commentText?: string;
  url?: string;
}

function getCasePath(data: ShareData): string {
  // For sharing, we always use the case id to avoid extra lookups and to have a consistent URL for tracking.
  return `/cases/${data.id}`;
}

export const generateShareUrl = (data: ShareData): string => {
  let baseUrl: string;
  
  switch (data.type) {
    case 'case':
      baseUrl = `${APP_URL}${getCasePath(data)}`;
      break;
    case 'profile':
      baseUrl = `${APP_URL}/users/${data.username || data.id}`;
      break;
    case 'comment':
      baseUrl = `${APP_URL}/cases/${data.id}#comment-${data.id}`;
      break;
    default:
      baseUrl = `${APP_URL}/cases/${data.id}`;
  }
  
  // Add tracking parameters for share attribution
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('utm_source', 'share');
  
  // Add medium parameter based on sharing method when known
  // This will be updated by the specific sharing methods
  
  return url.toString();
};

function shareTextForCase(title: string | undefined, lang: string): string {
  if (!title) {
    return lang === 'es' ? 'Mira este caso en eTribunal' : 'Check out this case on eTribunal';
  }
  return lang === 'es'
    ? `Mira este caso en eTribunal: "${title}"`
    : `Check out this case on eTribunal: "${title}"`;
}

function shareTextForProfile(data: ShareData, lang: string): string {
  const handle = data.username || data.id;
  return lang === 'es'
    ? `Mira el perfil de @${handle} en eTribunal`
    : `Check out @${handle}'s profile on eTribunal`;
}

function shareTextForComment(data: ShareData): string {
  if (!data.commentText) return 'eTribunal - An interesting comment';
  const preview = data.commentText.substring(0, 100);
  const suffix = data.commentText.length > 100 ? '...' : '';
  return `eTribunal - "${preview}${suffix}"`;
}

export const generateShareText = (data: ShareData, language?: string): string => {
  const lang = language || i18n.language || 'es';
  switch (data.type) {
    case 'case':
      return shareTextForCase(data.title, lang);
    case 'profile':
      return shareTextForProfile(data, lang);
    case 'comment':
      return shareTextForComment(data);
    default:
      return 'eTribunal';
  }
};

export const isWebShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
};

async function shareViaWebAPI(
  data: ShareData,
  setSharing: (value: boolean) => void
): Promise<boolean> {
  const url = generateShareUrl(data);
  const text = generateShareText(data);

  setSharing(true);
  try {
    const result = await navigator.share({
      title: 'eTribunal',
      text: text,
      url: url,
    });
    return result === undefined;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return false;
    }
    return false;
  } finally {
    setSharing(false);
  }
}

export const getWhatsAppLink = (data: ShareData): string => {
  const url = data.url || generateShareUrl(data);
  const text = generateShareText(data);
  const encodedText = encodeURIComponent(`${text}\n\n${url}`);
  return `https://wa.me/?text=${encodedText}`;
};

export const getTwitterLink = (data: ShareData): string => {
  const baseUrl = data.url || generateShareUrl(data);
  const text = encodeURIComponent(generateShareText(data));
  // Add utm_medium for twitter
  const urlWithMedium = new URL(baseUrl);
  urlWithMedium.searchParams.set('utm_medium', 'twitter');
  return `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(urlWithMedium.toString())}`;
};

export const getTelegramLink = (data: ShareData): string => {
  const baseUrl = data.url || generateShareUrl(data);
  const text = generateShareText(data);
  // Add utm_medium for telegram
  const urlWithMedium = new URL(baseUrl);
  urlWithMedium.searchParams.set('utm_medium', 'telegram');
  return `https://t.me/share/url?url=${encodeURIComponent(urlWithMedium.toString())}&text=${encodeURIComponent(text)}`;
};

export const getEmailLink = (data: ShareData): string => {
  const url = data.url || generateShareUrl(data);
  const text = generateShareText(data);
  const body = `${text}\n\n${url}`;
  return `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(body)}`;
};

export function useShare() {
  const [isSharing, setIsSharing] = useState(false);

  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!isWebShareSupported()) return false;
    return shareViaWebAPI(data, setIsSharing);
  }, []);

  const copyToClipboard = useCallback(async (data: ShareData): Promise<boolean> => {
    const url = generateShareUrl(data);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    share,
    copyToClipboard,
    isWebShareSupported,
    isSharing,
  };
}
