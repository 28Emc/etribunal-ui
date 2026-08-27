/**
 * ============================================
 * redux/store.ts — Configuración del Store Redux
 * ============================================
 *
 * ¿Qué hace?
 *   Crea el store de Redux combinando todos los slices.
 *
 * Slices:
 *   - auth:   Estado de autenticación (user, tokens, loading)
 *   - cases:  Casos (feed, currentCase, pagination)
 *   - ui:     UI global (theme, sidebar, toasts)
 *
 * DevTools:
 *   Solo se habilitan en desarrollo para evitar fugas de
 *   información en producción.
 *
 * Uso en componentes:
 *   import { useAppDispatch, useAppSelector } from '@redux/hooks';
 *   const dispatch = useAppDispatch();
 *   const user = useAppSelector(state => state.auth.user);
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import casesReducer from './slices/casesSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cases: casesReducer,
    ui: uiReducer,
  },
  // Activar DevTools solo en desarrollo
  devTools: import.meta.env.DEV,
});

// ============================================================
// Tipos inferidos del store
// ============================================================
// En vez de declarar RootState manualmente, usamos las
// utilidades de TypeScript de Redux para inferir el tipo
// exacto del estado y el dispatch.

/** Tipo del estado global del store (inferido automáticamente) */
export type RootState = ReturnType<typeof store.getState>;

/** Tipo del dispatch (incluye soporte para thunks) */
export type AppDispatch = typeof store.dispatch;
