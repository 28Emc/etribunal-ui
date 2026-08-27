import { useState, useCallback } from 'react';
import { createSlug } from '@utils/helpers';
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

export const generateShareText = (data: ShareData, language?: string): string => {
  const lang = language || i18n.language || 'es';
  switch (data.type) {
    case 'case':
      return data.title 
        ? (lang === 'es' ? `Mira este caso en eTribunal: "${data.title}"` : `Check out this case on eTribunal: "${data.title}"`)
        : (lang === 'es' ? 'Mira este caso en eTribunal' : 'Check out this case on eTribunal');
    case 'profile':
      return lang === 'es' 
        ? `Mira el perfil de @${data.username || data.id} en eTribunal` 
        : `Check out @${data.username || data.id}'s profile on eTribunal`;
    case 'comment':
      return data.commentText
        ? `eTribunal - "${data.commentText.substring(0, 100)}${data.commentText.length > 100 ? '...' : ''}"`
        : 'eTribunal - An interesting comment';
    default:
      return 'eTribunal';
  }
};

export const isWebShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
};

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
  return `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
};

export function useShare() {
  const [isSharing, setIsSharing] = useState(false);

  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    const url = generateShareUrl(data);
    const text = generateShareText(data);

    if (isWebShareSupported()) {
      try {
        setIsSharing(true);
        const result = await navigator.share({
          title: 'eTribunal',
          text: text,
          url: url,
        });
        setIsSharing(false);
        return result === undefined;
      } catch (error) {
        setIsSharing(false);
        if ((error as Error).name === 'AbortError') {
          return false;
        }
      }
    }

    return false;
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
