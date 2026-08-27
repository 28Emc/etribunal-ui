import { describe, it, expect, vi } from 'vitest';
import {
  API_CONFIG,
  PAGINATION,
  CASE_TYPES,
  CASE_STATUS,
  FEED_TABS,
  CATEGORIES,
  REACTIONS,
  STORAGE_KEYS,
  THEMES,
} from './constants';

describe('API_CONFIG', () => {
  it('debería tener BASE_URL definido', () => {
    expect(API_CONFIG.BASE_URL).toBeDefined();
    expect(API_CONFIG.BASE_URL).toContain('http');
  });

  it('debería tener timeout de 30000', () => {
    expect(API_CONFIG.TIMEOUT).toBe(30000);
  });

  it('debería usar URL de fallback cuando VITE_API_URL no está definido', async () => {
    const originalUrl = import.meta.env.VITE_API_URL;
    delete import.meta.env.VITE_API_URL;
    vi.resetModules();
    const { API_CONFIG: freshConfig } = await import('./constants');
    expect(freshConfig.BASE_URL).toBe('http://localhost:3001/api');
    import.meta.env.VITE_API_URL = originalUrl;
    vi.resetModules();
    await import('./constants');
  });
});

describe('PAGINATION', () => {
  it('debería tener valores correctos', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
  });
});

describe('CASE_TYPES', () => {
  it('debería tener classic y vote', () => {
    expect(CASE_TYPES.CLASSIC).toBe('classic');
    expect(CASE_TYPES.VOTE).toBe('vote');
  });
});

describe('CASE_STATUS', () => {
  it('debería tener WAITING, PUBLIC y CLOSED', () => {
    expect(CASE_STATUS.WAITING).toBe('WAITING');
    expect(CASE_STATUS.PUBLIC).toBe('PUBLIC');
    expect(CASE_STATUS.CLOSED).toBe('CLOSED');
  });
});

describe('FEED_TABS', () => {
  it('debería tener las tres tabs', () => {
    expect(FEED_TABS.FOR_YOU).toBe('for_you');
    expect(FEED_TABS.FOLLOWING).toBe('following');
    expect(FEED_TABS.TRENDING).toBe('trending');
  });
});

describe('CATEGORIES', () => {
  it('debería tener 7 categorías', () => {
    expect(CATEGORIES).toHaveLength(7);
    expect(CATEGORIES).toContain('Justice');
    expect(CATEGORIES).toContain('Other');
  });
});

describe('REACTIONS', () => {
  it('debería tener LIKE, LOVE, ANGRY', () => {
    expect(REACTIONS.LIKE).toBe('LIKE');
    expect(REACTIONS.LOVE).toBe('LOVE');
    expect(REACTIONS.ANGRY).toBe('ANGRY');
  });
});

describe('STORAGE_KEYS', () => {
  it('debería tener las keys correctas', () => {
    expect(STORAGE_KEYS.TOKEN).toBe('etribunal_token');
    expect(STORAGE_KEYS.USER).toBe('etribunal_user');
    expect(STORAGE_KEYS.THEME).toBe('etribunal_theme');
  });
});

describe('THEMES', () => {
  it('debería tener dark y light', () => {
    expect(THEMES.DARK).toBe('dark');
    expect(THEMES.LIGHT).toBe('light');
  });
});
