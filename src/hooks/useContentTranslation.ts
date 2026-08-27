import { useState, useCallback } from 'react';
import { translateCaseApi, translateCommentApi } from '../features/translation/services/translationApi';
import type { TranslatedCase, TranslatedComment } from '../features/translation/types';

interface UseContentTranslationReturn {
  translateCase: (caseId: string, targetLanguage: string) => Promise<TranslatedCase>;
  translateComment: (commentId: string, targetLanguage: string) => Promise<TranslatedComment>;
  showOriginal: () => void;
  showTranslated: () => void;
  isTranslating: boolean;
  translatedCase: TranslatedCase | null;
  translatedComment: TranslatedComment | null;
  showTranslation: boolean;
  setTranslatedCase: (t: TranslatedCase | null) => void;
  setTranslatedComment: (t: TranslatedComment | null) => void;
}

export function useContentTranslation(): UseContentTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedCase, setTranslatedCase] = useState<TranslatedCase | null>(null);
  const [translatedComment, setTranslatedComment] = useState<TranslatedComment | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslateCase = useCallback(async (caseId: string, targetLanguage: string): Promise<TranslatedCase> => {
    setIsTranslating(true);
    try {
      const result = await translateCaseApi(caseId, targetLanguage);
      setTranslatedCase(result);
      setShowTranslation(true);
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const handleTranslateComment = useCallback(async (commentId: string, targetLanguage: string): Promise<TranslatedComment> => {
    setIsTranslating(true);
    try {
      const result = await translateCommentApi(commentId, targetLanguage);
      setTranslatedComment(result);
      setShowTranslation(true);
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const showOriginal = useCallback(() => {
    setShowTranslation(false);
  }, []);

  const showTranslated = useCallback(() => {
    setShowTranslation(true);
  }, []);

  return {
    translateCase: handleTranslateCase,
    translateComment: handleTranslateComment,
    showOriginal,
    showTranslated,
    isTranslating,
    translatedCase,
    translatedComment,
    showTranslation,
    setTranslatedCase,
    setTranslatedComment,
  };
}
