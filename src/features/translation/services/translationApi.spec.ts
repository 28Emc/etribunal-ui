import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateCaseApi, translateCommentApi } from './translationApi';

const mockPost = vi.fn();

vi.mock('@api/client', () => ({
  apiClient: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

describe('translationApi', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('translateCaseApi debería llamar al endpoint correcto y mapear respuesta', async () => {
    mockPost.mockResolvedValue({
      id: 't1',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      title: 'My Case',
      sideA: 'Story A',
      sideB: 'Story B',
      sideASubtitle: 'Sub A',
      sideBSubtitle: 'Sub B',
      bothWrongSubtitle: 'Both wrong',
    });

    const result = await translateCaseApi('case-1', 'en');

    expect(mockPost).toHaveBeenCalledWith('/translations/cases/case-1', { targetLanguage: 'en' });
    expect(result.sourceLanguage).toBe('es');
    expect(result.title).toBe('My Case');
    expect(result.sideA).toBe('Story A');
    expect(result.sideB).toBe('Story B');
    expect(result.sideASubtitle).toBe('Sub A');
  });

  it('translateCaseApi debería manejar sideB null', async () => {
    mockPost.mockResolvedValue({
      id: 't2',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      title: 'Title',
      sideA: 'Story A',
      sideB: null,
    });

    const result = await translateCaseApi('case-2', 'en');
    expect(result.sideB).toBeNull();
  });

  it('translateCommentApi debería llamar al endpoint correcto y mapear respuesta', async () => {
    mockPost.mockResolvedValue({
      id: 'ct1',
      commentId: 'c1',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      content: 'Hello world',
    });

    const result = await translateCommentApi('comment-1', 'en');

    expect(mockPost).toHaveBeenCalledWith('/translations/comments/comment-1', { targetLanguage: 'en' });
    expect(result.content).toBe('Hello world');
    expect(result.commentId).toBe('c1');
  });
});
