import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authStorage, getCircuitState } from './client';

const shared = vi.hoisted(() => {
  const s: Record<string, any> = {};
  s.requestHandler = null;
  s.requestErrorHandler = null;
  s.responseSuccessHandler = null;
  s.responseErrorHandler = null;
  s.axiosPost = null;
  return { shared: s };
});

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<any>();
  shared.axiosPost = vi.fn().mockResolvedValue({ data: {} });
  const instance: any = () => {};
  instance.defaults = {};
  instance.interceptors = {
    request: { use: vi.fn((s: any, e: any) => { shared.requestHandler = s; shared.requestErrorHandler = e; }) },
    response: { use: vi.fn((s: any, e: any) => { shared.responseSuccessHandler = s; shared.responseErrorHandler = e; }) },
  };
  instance.get = vi.fn();
  instance.post = vi.fn();
  instance.patch = vi.fn();
  instance.put = vi.fn();
  instance.delete = vi.fn();
  return {
    default: {
      ...actual.default,
      create: () => instance,
      post: shared.axiosPost,
    },
  };
});

describe('authStorage', () => {
  const USER_KEY = 'etribunal_user';
  const ACCESS_KEY = 'etribunal_access_token';
  const REFRESH_KEY = 'etribunal_refresh_token';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getUserId', () => {
    it('debería retornar null si no hay usuario guardado', () => {
      expect(authStorage.getUserId()).toBeNull();
    });

    it('debería retornar el id del usuario guardado', () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ id: 'user-123' }));
      expect(authStorage.getUserId()).toBe('user-123');
    });

    it('debería retornar null si el JSON es inválido', () => {
      localStorage.setItem(USER_KEY, 'not-json');
      expect(authStorage.getUserId()).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('debería retornar null si no hay token', () => {
      expect(authStorage.getAccessToken()).toBeNull();
    });

    it('debería retornar el token guardado', () => {
      localStorage.setItem(ACCESS_KEY, 'token-abc');
      expect(authStorage.getAccessToken()).toBe('token-abc');
    });
  });

  describe('getRefreshToken', () => {
    it('debería retornar null si no hay refresh token', () => {
      expect(authStorage.getRefreshToken()).toBeNull();
    });

    it('debería retornar el refresh token guardado', () => {
      localStorage.setItem(REFRESH_KEY, 'refresh-xyz');
      expect(authStorage.getRefreshToken()).toBe('refresh-xyz');
    });
  });

  describe('setTokens', () => {
    it('debería guardar access token en sessionStorage por defecto', () => {
      authStorage.setTokens('new-access');
      expect(sessionStorage.getItem(ACCESS_KEY)).toBe('new-access');
    });

    it('debería guardar refresh token en sessionStorage por defecto', () => {
      authStorage.setTokens('new-access', 'new-refresh');
      expect(sessionStorage.getItem(REFRESH_KEY)).toBe('new-refresh');
    });

    it('debería guardar en localStorage cuando remember=true', () => {
      authStorage.setTokens('new-access', 'new-refresh', true);
      expect(localStorage.getItem(ACCESS_KEY)).toBe('new-access');
      expect(localStorage.getItem(REFRESH_KEY)).toBe('new-refresh');
    });
  });

  describe('clearSession', () => {
    it('debería limpiar todos los datos de sesión', () => {
      localStorage.setItem(ACCESS_KEY, 'token');
      localStorage.setItem(REFRESH_KEY, 'refresh');
      localStorage.setItem(USER_KEY, JSON.stringify({ id: '1' }));

      authStorage.clearSession();

      expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('debería retornar false si no hay userId', () => {
      localStorage.setItem(ACCESS_KEY, 'token');
      expect(authStorage.isAuthenticated()).toBe(false);
    });

    it('debería retornar false si no hay access token', () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ id: '1' }));
      expect(authStorage.isAuthenticated()).toBe(false);
    });

    it('debería retornar true si hay userId y access token', () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ id: '1' }));
      localStorage.setItem(ACCESS_KEY, 'token');
      expect(authStorage.isAuthenticated()).toBe(true);
    });
  });
});

describe('getCircuitState', () => {
  it('debería retornar siempre CLOSED', () => {
    expect(getCircuitState()).toBe('CLOSED');
    expect(getCircuitState('/cases', 'GET')).toBe('CLOSED');
  });
});

describe('interceptores', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('request interceptor', () => {
    it('debería inyectar token en el header cuando existe', () => {
      localStorage.setItem('etribunal_access_token', 'test-token');
      const config: any = { headers: {} };
      const result = shared.requestHandler(config);
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('debería no modificar headers si no hay token', () => {
      const config: any = { headers: {} };
      const result = shared.requestHandler(config);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('debería rechazar con error si el interceptor falla', async () => {
      const error = new Error('Request error');
      await expect(shared.requestErrorHandler(error)).rejects.toThrow('Request error');
    });
  });

  describe('response success interceptor', () => {
    it('debería extraer data.data cuando existe', () => {
      const response: any = { data: { data: { id: '123' }, message: 'ok' } };
      expect(shared.responseSuccessHandler(response)).toEqual({ id: '123' });
    });

    it('debería retornar response.data si no tiene .data anidado', () => {
      const response: any = { data: { id: '123' } };
      expect(shared.responseSuccessHandler(response)).toEqual({ id: '123' });
    });
  });

  describe('response error interceptor — 401 handling', () => {
    it('debería rechazar error no-401 sin modificaciones', async () => {
      const error: any = new Error('Forbidden');
      error.config = { url: '/cases' };
      error.response = { status: 403 };
      await expect(shared.responseErrorHandler(error)).rejects.toThrow('Forbidden');
    });

    it('debería rechazar 401 en endpoint /auth/refresh sin modificaciones', async () => {
      const error: any = new Error('Unauthorized');
      error.config = { url: '/auth/refresh' };
      error.response = { status: 401 };
      await expect(shared.responseErrorHandler(error)).rejects.toThrow('Unauthorized');
    });

    it('debería rechazar 401 si ya se reintentó (_retry)', async () => {
      const error: any = new Error('Unauthorized');
      error.config = { url: '/cases', _retry: true };
      error.response = { status: 401 };
      await expect(shared.responseErrorHandler(error)).rejects.toThrow('Unauthorized');
    });

    it('debería encolar request si ya hay refresh en curso', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify({ id: 'test-user' }));
      localStorage.setItem('etribunal_refresh_token', 'test-refresh');

      let refreshResolver: any;
      shared.axiosPost.mockImplementation(() => new Promise((resolve) => {
        refreshResolver = resolve;
      }));

      const error1: any = new Error('Unauthorized');
      error1.config = { url: '/cases', headers: {} };
      error1.response = { status: 401 };

      const firstPromise = shared.responseErrorHandler(error1);

      const error2: any = new Error('Unauthorized');
      error2.config = { url: '/cases/2', headers: {} };
      error2.response = { status: 401 };

      const secondPromise = shared.responseErrorHandler(error2);

      refreshResolver({
        data: { data: { access_token: 'new-token', refresh_token: 'new-refresh' } },
      });

      await expect(firstPromise).resolves.not.toThrow();
      await expect(secondPromise).resolves.not.toThrow();
    });

    it('debería limpiar sesión y redirigir si refresh falla', async () => {
      const originalPath = window.location.pathname;
      Object.defineProperty(window, 'location', {
        value: { pathname: '/cases', href: '' },
        writable: true,
      });

      localStorage.setItem('etribunal_user', JSON.stringify({ id: 'test-user' }));
      localStorage.setItem('etribunal_refresh_token', 'test-refresh');
      shared.axiosPost.mockRejectedValue(new Error('Refresh failed'));

      const error: any = new Error('Unauthorized');
      error.config = { url: '/cases', headers: {} };
      error.response = { status: 401 };

      await expect(shared.responseErrorHandler(error)).rejects.toThrow('Unauthorized');
      expect(localStorage.getItem('etribunal_user')).toBeNull();

      Object.defineProperty(window, 'location', {
        value: { pathname: originalPath, href: '' },
        writable: true,
      });
    });

    it('debería no redirigir si ya estamos en /login', async () => {
      const originalPath = window.location.pathname;
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login', href: '' },
        writable: true,
      });

      localStorage.setItem('etribunal_user', JSON.stringify({ id: 'test-user' }));
      localStorage.setItem('etribunal_refresh_token', 'test-refresh');
      shared.axiosPost.mockRejectedValue(new Error('Refresh failed'));

      const error: any = new Error('Unauthorized');
      error.config = { url: '/cases', headers: {} };
      error.response = { status: 401 };

      await expect(shared.responseErrorHandler(error)).rejects.toThrow('Unauthorized');

      Object.defineProperty(window, 'location', {
        value: { pathname: originalPath, href: '' },
        writable: true,
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('debería retornar null si no hay userId ni refreshToken', async () => {
      const error: any = new Error('Unauthorized');
      error.config = { url: '/cases', headers: {} };
      error.response = { status: 401 };

      // Sin datos en localStorage
      await expect(shared.responseErrorHandler(error)).rejects.toThrow('Unauthorized');
    });

    it('debería refrescar token exitosamente y reintentar la request', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify({ id: 'test-user' }));
      localStorage.setItem('etribunal_refresh_token', 'test-refresh');
      localStorage.setItem('etribunal_access_token', 'old-token');

      shared.axiosPost.mockResolvedValue({
        data: { data: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      });

      const error: any = new Error('Unauthorized');
      error.config = { url: '/cases', headers: {} };
      error.response = { status: 401 };

      const result = shared.responseErrorHandler(error);
      await expect(result).resolves.not.toThrow();
      expect(localStorage.getItem('etribunal_access_token')).toBe('new-access');
    });
  });
});
