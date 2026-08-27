import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContentTranslation } from './useContentTranslation';

const mockTranslateCaseApi = vi.fn();
const mockTranslateCommentApi = vi.fn();

vi.mock('../features/translation/services/translationApi', () => ({
  translateCaseApi: (...args: any[]) => mockTranslateCaseApi(...args),
  translateCommentApi: (...args: any[]) => mockTranslateCommentApi(...args),
}));

describe('useContentTranslation', () => {
  beforeEach(() => {
    mockTranslateCaseApi.mockReset();
    mockTranslateCommentApi.mockReset();
  });

  it('debería devolver estado inicial', () => {
    const { result } = renderHook(() => useContentTranslation());

    expect(result.current.isTranslating).toBe(false);
    expect(result.current.translatedCase).toBeNull();
    expect(result.current.translatedComment).toBeNull();
    expect(result.current.showTranslation).toBe(false);
  });

  it('translateCase debería traducir un caso', async () => {
    const { result } = renderHook(() => useContentTranslation());

    const translated = {
      id: 't1',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      title: 'My Case',
      sideA: 'Story A',
      sideB: null,
      sideASubtitle: null,
      sideBSubtitle: null,
      bothWrongSubtitle: null,
    };

    mockTranslateCaseApi.mockResolvedValue(translated);

    let res: any;
    await act(async () => {
      res = await result.current.translateCase('case-1', 'en');
    });

    expect(res).toEqual(translated);
    expect(result.current.translatedCase).toEqual(translated);
    expect(result.current.showTranslation).toBe(true);
    expect(mockTranslateCaseApi).toHaveBeenCalledWith('case-1', 'en');
  });

  it('translateComment debería traducir un comentario', async () => {
    const { result } = renderHook(() => useContentTranslation());

    const translated = {
      id: 't1',
      commentId: 'c1',
      sourceLanguage: 'es',
      targetLanguage: 'en',
      content: 'Hello world',
    };

    mockTranslateCommentApi.mockResolvedValue(translated);

    let res: any;
    await act(async () => {
      res = await result.current.translateComment('comment-1', 'en');
    });

    expect(res).toEqual(translated);
    expect(result.current.translatedComment).toEqual(translated);
    expect(result.current.showTranslation).toBe(true);
  });

  it('showOriginal y showTranslated deberían alternar visibilidad', () => {
    const { result } = renderHook(() => useContentTranslation());

    act(() => {
      result.current.showTranslated();
    });
    expect(result.current.showTranslation).toBe(true);

    act(() => {
      result.current.showOriginal();
    });
    expect(result.current.showTranslation).toBe(false);
  });

  it('setTranslatedCase debería actualizar el estado', () => {
    const { result } = renderHook(() => useContentTranslation());

    act(() => {
      result.current.setTranslatedCase({ id: 't1' } as any);
    });

    expect(result.current.translatedCase).toEqual({ id: 't1' });
  });

  it('setTranslatedComment debería actualizar el estado', () => {
    const { result } = renderHook(() => useContentTranslation());

    act(() => {
      result.current.setTranslatedComment({ id: 't1' } as any);
    });

    expect(result.current.translatedComment).toEqual({ id: 't1' });
  });
});
