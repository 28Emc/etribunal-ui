import { beforeEach, describe, expect, it } from 'vitest';
import { consumeInviteDeepLink, setInviteDeepLink } from './inviteDeepLink';

describe('invite deep link storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and consumes a valid path once', () => {
    setInviteDeepLink('/invite/abc');

    expect(consumeInviteDeepLink()).toBe('/invite/abc');
    expect(consumeInviteDeepLink()).toBeNull();
  });

  it('consumes any stored invite token and removes it', () => {
    sessionStorage.setItem('etribunal_invite_token', 'token-value');

    expect(consumeInviteDeepLink()).toBe('token-value');
    expect(sessionStorage.getItem('etribunal_invite_token')).toBeNull();
  });
});
