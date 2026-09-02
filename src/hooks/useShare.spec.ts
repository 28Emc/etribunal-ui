import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  generateShareUrl,
  generateShareText,
  getWhatsAppLink,
  getTwitterLink,
  getTelegramLink,
  getEmailLink,
  isWebShareSupported,
  useShare,
} from './useShare';

vi.mock('../services/i18n', () => ({
  default: { language: 'es' },
}));

describe('generateShareUrl', () => {
  it('debería generar URL para un caso', () => {
    const url = generateShareUrl({ type: 'case', id: '123', title: 'Test' });
    expect(url).toContain('/cases/123');
    expect(url).toContain('utm_source=share');
  });

  it('debería generar URL para un perfil', () => {
    const url = generateShareUrl({ type: 'profile', id: '456', username: 'juanperez' });
    expect(url).toContain('/users/juanperez');
    expect(url).toContain('utm_source=share');
  });

  it('debería generar URL para un comentario', () => {
    const url = generateShareUrl({ type: 'comment', id: '789', title: 'Case Title' });
    expect(url).toContain('/cases/789');
    expect(url).toContain('utm_source=share');
  });
});

describe('generateShareText', () => {
  it('debería generar texto para caso en español', () => {
    const text = generateShareText({ type: 'case', title: 'Mi Caso', id: '1' }, 'es');
    expect(text).toContain('Mira este caso en eTribunal');
    expect(text).toContain('Mi Caso');
  });

  it('debería generar texto para caso en inglés', () => {
    const text = generateShareText({ type: 'case', title: 'My Case', id: '1' }, 'en');
    expect(text).toContain('Check out this case on eTribunal');
    expect(text).toContain('My Case');
  });

  it('debería generar texto para perfil', () => {
    const text = generateShareText({ type: 'profile', username: 'juanperez', id: '1' });
    expect(text).toContain('@juanperez');
  });

  it('debería truncar texto largo de comentario', () => {
    const long = 'a'.repeat(200);
    const text = generateShareText({ type: 'comment', commentText: long, id: '1' });
    expect(text.length).toBeLessThan(150);
    expect(text).toContain('...');
  });
});

describe('Social links', () => {
  const data = { type: 'case' as const, id: '123', title: 'Test Case' };

  it('getWhatsAppLink debería generar URL de WhatsApp', () => {
    const link = getWhatsAppLink(data);
    expect(link).toContain('https://wa.me/?text=');
    expect(link).toContain('Test%20Case');
  });

  it('getTwitterLink debería generar URL de Twitter', () => {
    const link = getTwitterLink(data);
    expect(link).toContain('https://twitter.com/intent/tweet');
    expect(link).toContain('utm_medium%3Dtwitter');
  });

  it('getTelegramLink debería generar URL de Telegram', () => {
    const link = getTelegramLink(data);
    expect(link).toContain('https://t.me/share/url');
    expect(link).toContain('utm_medium%3Dtelegram');
  });

  it('getEmailLink debería generar URL de email', () => {
    const link = getEmailLink(data);
    expect(link).toContain('mailto:');
    expect(link).toContain('subject=');
  });
});

describe('isWebShareSupported', () => {
  it('debería devolver true si navigator.share existe', () => {
    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;
    Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: vi.fn(), configurable: true });
    expect(isWebShareSupported()).toBe(true);
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true });
  });

  it('debería devolver false si navigator.share no existe', () => {
    const originalShare = navigator.share;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    expect(isWebShareSupported()).toBe(false);
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
  });
});

describe('generateShareUrl default case', () => {
  it('debería usar default case para type desconocido', () => {
    const url = generateShareUrl({ type: 'comment' as any, id: '999' });
    expect(url).toContain('/cases/999');
    expect(url).toContain('utm_source=share');
  });
});

describe('generateShareText default case', () => {
  it('debería retornar eTribunal para type desconocido', () => {
    const text = generateShareText({ type: 'unknown' as any, id: '0' });
    expect(text).toBe('eTribunal');
  });

  it('debería generar texto para caso sin título en español', () => {
    const text = generateShareText({ type: 'case', id: '1' }, 'es');
    expect(text).toContain('Mira este caso en eTribunal');
  });

  it('debería generar texto para caso sin título en inglés', () => {
    const text = generateShareText({ type: 'case', id: '1' }, 'en');
    expect(text).toContain('Check out this case on eTribunal');
  });

  it('debería generar texto para perfil en inglés', () => {
    const text = generateShareText({ type: 'profile', id: 'u1', username: 'test' }, 'en');
    expect(text).toContain('Check out @test');
  });

  it('debería generar texto para comentario sin commentText', () => {
    const text = generateShareText({ type: 'comment', id: 'c1' });
    expect(text).toContain('An interesting comment');
  });
});

describe('useShare hook', () => {
  it('share debería usar Web Share API si está soportado', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    const canShareFn = vi.fn().mockReturnValue(true);
    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;
    Object.defineProperty(navigator, 'share', { value: shareFn, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareFn, configurable: true });

    const { result } = renderHook(() => useShare());
    const data = { type: 'case' as const, id: '123', title: 'Test' };
    let success = false;
    await act(async () => { success = await result.current.share(data); });
    expect(shareFn).toHaveBeenCalled();
    expect(success).toBe(true);
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true });
  });

  it('share debería retornar false en AbortError', async () => {
    const shareFn = vi.fn().mockRejectedValue({ name: 'AbortError' });
    const canShareFn = vi.fn().mockReturnValue(true);
    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;
    Object.defineProperty(navigator, 'share', { value: shareFn, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareFn, configurable: true });

    const { result } = renderHook(() => useShare());
    const data = { type: 'case' as const, id: '123', title: 'Test' };
    let success = true;
    await act(async () => { success = await result.current.share(data); });
    expect(success).toBe(false);
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true });
  });

  it('share debería retornar false si Web Share no está soportado', async () => {
    const originalShare = navigator.share;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });

    const { result } = renderHook(() => useShare());
    const data = { type: 'case' as const, id: '123', title: 'Test' };
    let success = true;
    await act(async () => { success = await result.current.share(data); });
    expect(success).toBe(false);
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
  });

  it('copyToClipboard debería copiar URL al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const { result } = renderHook(() => useShare());
    const data = { type: 'case' as const, id: '123', title: 'Test' };
    let success = false;
    await act(async () => { success = await result.current.copyToClipboard(data); });
    expect(writeText).toHaveBeenCalled();
    expect(success).toBe(true);
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
  });

  it('copyToClipboard debería retornar false si falla', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const { result } = renderHook(() => useShare());
    const data = { type: 'case' as const, id: '123', title: 'Test' };
    let success = true;
    await act(async () => { success = await result.current.copyToClipboard(data); });
    expect(success).toBe(false);
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
  });
});
