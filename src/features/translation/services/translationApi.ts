import { apiClient } from '@api/client';
import type { TranslatedCase, TranslatedComment } from '../types';

export async function translateCaseApi(caseId: string, targetLanguage: string): Promise<TranslatedCase> {
  const res = await apiClient.post(`/translations/cases/${caseId}`, { targetLanguage }) as any;
  return {
    id: res.id,
    sourceLanguage: res.sourceLanguage,
    targetLanguage: res.targetLanguage,
    title: res.title,
    sideA: res.sideA,
    sideB: res.sideB || null,
    sideASubtitle: res.sideASubtitle || null,
    sideBSubtitle: res.sideBSubtitle || null,
    bothWrongSubtitle: res.bothWrongSubtitle || null,
  };
}

export async function translateCommentApi(commentId: string, targetLanguage: string): Promise<TranslatedComment> {
  const res = await apiClient.post(`/translations/comments/${commentId}`, { targetLanguage }) as any;
  return {
    id: res.id,
    commentId: res.commentId,
    sourceLanguage: res.sourceLanguage,
    targetLanguage: res.targetLanguage,
    content: res.content,
  };
}
