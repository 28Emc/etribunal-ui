import { describe, it, expect } from 'vitest';
import { getDisplayName, getAnonymousAvatar } from './anonymity';

describe('getDisplayName', () => {
  it('debería devolver el username si no es anónimo', () => {
    expect(getDisplayName('juanperez', false, 'user_123')).toBe('juanperez');
  });

  it('debería devolver "Anonymous" si no hay username ni userId', () => {
    expect(getDisplayName(undefined, undefined, undefined)).toBe('Anonymous');
  });

  it('debería devolver el username si es anónimo pero sin userId', () => {
    expect(getDisplayName('juanperez', true, undefined)).toBe('juanperez');
  });

  it('debería generar hash determinista para anónimos', () => {
    const name1 = getDisplayName(undefined, true, 'user_abc123');
    const name2 = getDisplayName(undefined, true, 'user_abc123');
    expect(name1).toBe(name2);
    expect(name1).toMatch(/^Anónimo #\d{4}$/);
  });

  it('debería generar diferentes hashes para diferentes userIds', () => {
    const name1 = getDisplayName(undefined, true, 'user_001');
    const name2 = getDisplayName(undefined, true, 'user_002');
    expect(name1).not.toBe(name2);
  });
});

describe('getAnonymousAvatar', () => {
  it('debería devolver URL con seed por defecto si no hay userId', () => {
    const url = getAnonymousAvatar(undefined);
    expect(url).toBe('https://api.dicebear.com/7.x/identicon/svg?seed=default');
  });

  it('debería incluir el userId como seed', () => {
    const url = getAnonymousAvatar('user_abc123');
    expect(url).toBe('https://api.dicebear.com/7.x/identicon/svg?seed=user_abc123');
  });

  it('debería ser determinista para el mismo userId', () => {
    const url1 = getAnonymousAvatar('user_xyz');
    const url2 = getAnonymousAvatar('user_xyz');
    expect(url1).toBe(url2);
  });
});
