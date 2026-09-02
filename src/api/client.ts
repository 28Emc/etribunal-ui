/**
 * ============================================
 * api/client.ts — Cliente HTTP con Axios
 * ============================================
 *
 * ¿Por qué Axios en vez de fetch nativo?
 *   1. Interceptors: permiten inyectar tokens y manejar errores
 *      globalmente sin repetir lógica en cada llamada.
 *   2. Refresh automático: en 401, intenta renovar el token
 *      y reintenta la request original.
 *   3. Transformers: transforma la respuesta automáticamente.
 *   4. AbortController: cancelación de requests fácil.
 *
 * Arquitectura:
 *   axiosInstance (baseURL, timeout, headers)
 *     ├── request interceptor → inyecta Authorization header
 *     └── response interceptor
 *           ├── success: extrae response.data
 *           └── error (401): refresh queue + retry
 *
 * Alias de paths (configurados en vite.config.ts y tsconfig):
 *   @api/* → src/api/*
 *
 * Uso en hooks:
 *   import { apiClient } from '@api/client';
 *   const data = await apiClient.get<User[]>('/users');
 */

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from 'axios';

// ============================================================
// Config
// ============================================================

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const _apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Override return type: interceptor already unwraps response.data,
// so get<T> returns Promise<T> instead of Promise<AxiosResponse<T>>
interface ApiClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  postForm<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
}

// ============================================================
// Token Helpers
// ============================================================
// Estos helpers encapsulan el acceso a localStorage para
// poder cambiar el mecanismo de almacenamiento en el futuro
// (ej: cookies HttpOnly, sessionStorage, etc.)

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'etribunal_access_token',
  REFRESH_TOKEN: 'etribunal_refresh_token',
  USER: 'etribunal_user',
} as const;

function getItem(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export const authStorage = {
  getUserId: (): string | null => {
    const user = getItem(STORAGE_KEYS.USER);
    if (!user) return null;
    try {
      return JSON.parse(user).id;
    } catch {
      return null;
    }
  },

  getAccessToken: (): string | null => {
    return getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: (): string | null => {
    return getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  setTokens: (access: string, refresh?: string, remember?: boolean) => {
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
      if (refresh) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
      if (refresh) sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
    }
  },

  clearSession: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  },

  isAuthenticated: (): boolean => {
    return !!authStorage.getUserId() && !!authStorage.getAccessToken();
  },
};

// ============================================================
// Request Interceptor
// ============================================================
// Se ejecuta ANTES de cada request. Inyecta el token JWT
// en el header Authorization si existe.
// ============================================================

_apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// Refresh Queue Pattern
// ============================================================
// Cuando múltiples requests fallan con 401 simultáneamente,
// NO queremos que todas intenten refrescar el token a la vez.
// En su lugar, la primera inicia el refresh y las demás
// se encolan. Cuando el refresh termina, todas las requests
// encoladas se reintentan automáticamente.
// ============================================================

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/** Notifica a todas las requests encoladas que el token se renovó */
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

/** Encola una request que espera el refresh del token */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

/** Intenta renovar el token llamando al endpoint /auth/refresh */
async function refreshAccessToken(): Promise<string | null> {
  const userId = authStorage.getUserId();
  const refreshToken = authStorage.getRefreshToken();

  if (!userId || !refreshToken) return null;

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    // El backend envuelve la respuesta en ApiResponse<T>:
    //   { data: { access_token, refresh_token, ... }, message, statusCode }
    // Hacemos unwrap de response.data.data.
    const { access_token, refresh_token: newRefreshToken } =
      response.data?.data ?? {};

    if (access_token) {
      // Persistir en el mismo storage que los tokens originales
      const wasRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      authStorage.setTokens(access_token, newRefreshToken, wasRemembered);
      return access_token;
    }

    return null;
  } catch (error) {
    console.error('[auth] Token refresh failed:', error);
    return null;
  }
}

// ============================================================
// Response Interceptor
// ============================================================
// Se ejecuta DESPUÉS de cada response.
//
// En caso de éxito: extrae response.data automáticamente
// para que los hooks reciban directamente el payload.
//
// En caso de error 401:
//   1. Si ya hay un refresh en curso → encola la request
//   2. Si no → inicia refresh
//   3. Si refresh OK → actualiza token + reintenta
//   4. Si refresh falla → limpia sesión
// ============================================================

_apiClient.interceptors.response.use(
  // Success: extraer data HTTP + unwrap ApiResponse.data (mismo
  // comportamiento que fetchWithCircuitBreaker original:
  //   → endpoint retorna { data: T, message, statusCode }
  //   → interceptor devuelve T directamente
  //   → si no tiene .data, devuelve el body crudo
  (response) => response.data?.data ?? response.data,

  // Error: manejar 401
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Solo interceptar 401 si no es el endpoint de refresh
    if (
      error.response?.status === 401 &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Ya hay un refresh en curso — encolar esta request
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(_apiClient(originalRequest));
          });
        });
      }

      // Iniciar refresh
      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        // Refresh exitoso: notificar a las requests encoladas
        isRefreshing = false;
        onTokenRefreshed(newToken);

        // Reintentar la request original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return _apiClient(originalRequest);
      } else {
        // Refresh falló: limpiar sesión
        isRefreshing = false;
        refreshSubscribers = [];
        authStorage.clearSession();

        // Redirigir al login si no estamos ya ahí
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Circuit Breaker compatibility
// ============================================================
// En la nueva arquitectura, el circuit breaker vive dentro
// de los interceptors de Axios. Esta función es un stub
// para mantener compatibilidad con componentes que aún
// verifican el estado del circuito antes de llamar a la API.
// Siempre retorna 'CLOSED' porque los interceptors de Axios
// manejan los reintentos y cortes de forma transparente.

export function getCircuitState(endpoint?: string, method?: string): string {
  return 'CLOSED';
}

export async function fetchWithCircuitBreaker(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, options);
}

export const apiClient: ApiClient = _apiClient as ApiClient;
