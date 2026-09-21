const INVITE_TOKEN_KEY = 'etribunal_invite_token';

export function setInviteDeepLink(token: string): void {
  sessionStorage.setItem(INVITE_TOKEN_KEY, token);
}

export function consumeInviteDeepLink(): string | null {
  const token = sessionStorage.getItem(INVITE_TOKEN_KEY);
  if (token) sessionStorage.removeItem(INVITE_TOKEN_KEY);
  return token;
}
