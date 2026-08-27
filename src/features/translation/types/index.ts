export interface TranslatedCase {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  title: string;
  sideA: string;
  sideB: string | null;
  sideASubtitle: string | null;
  sideBSubtitle: string | null;
  bothWrongSubtitle: string | null;
}

export interface TranslatedComment {
  id: string;
  commentId: string;
  sourceLanguage: string;
  targetLanguage: string;
  content: string;
}
