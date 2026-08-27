/**
 * ============================================
 * App — Componente Raíz
 * ============================================
 *
 * Jerarquía de providers (de afuera hacia adentro):
 *   1. ReduxProvider    — Estado global (Redux Toolkit)
 *   2. AuthProvider     — Contexto de autenticación (temporal, se migrará a Redux)
 *   3. HelmetProvider   — Manejo SEO (<title>, meta tags)
 *   4. ErrorBoundary    — Captura errores no controlados
 *   5. ToastProvider    — Sistema de notificaciones
 *   6. BrowserRouter    — Routing SPA
 *      └── AppRouter    — Definiciones de rutas
 *
 * Nota: AuthProvider se eliminará en Phase 09 cuando migremos
 * toda la lógica de auth a Redux Toolkit.
 */

import { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from '@components/ui/ErrorBoundary';
import { ToastProvider } from '@components/ui/Toast';
import { AuthProvider } from '@context/AuthContext';
import { AppRoutes } from '@routing/index';
import { store } from '@redux/store';
import { apiClient } from '@api/client';

export default function App() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get('utm_source');
    if (utmSource === 'share') {
      const pathname = url.pathname;
      let id: string | null = null;
      let type: 'case' | 'user' | null = null;

      if (pathname.startsWith('/cases/')) {
        const segments = pathname.split('/');
        if (segments.length >= 3) {
          id = segments[2];
          type = 'case';
        }
      } else if (pathname.startsWith('/users/')) {
        const segments = pathname.split('/');
        if (segments.length >= 3) {
          id = segments[2];
          type = 'user';
        }
      }

      if (id && type) {
        const endpoint = type === 'case'
          ? `/cases/${id}/track-share`
          : `/users/${id}/track-share`;

        apiClient.post(endpoint).catch(() => {
          /* fire-and-forget */
        });

        url.searchParams.delete('utm_source');
        url.searchParams.delete('utm_medium');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        <HelmetProvider>
          <ErrorBoundary>
            <ToastProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </ToastProvider>
          </ErrorBoundary>
        </HelmetProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}

