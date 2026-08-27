/**
 * ============================================
 * redux/slices/uiSlice.ts — Estado Global de UI
 * ============================================
 *
 * ¿Qué contiene?
 *   Estado global relacionado con la interfaz de usuario
 *   que debe ser accesible desde múltiples componentes.
 *
 * ¿Por qué va en Redux y no en Context?
 *   Porque el estado de UI (tema, sidebar) se necesita
 *   en componentes de diferentes ramas del árbol.
 *   Redux evita "prop drilling" innecesario.
 *
 * Slice: UI
 *   - theme:       dark | light (persistido en localStorage)
 *   - sidebarOpen: controla visibilidad del sidebar móvil
 *   - toasts:      cola de notificaciones
 *   - activeModal: modal actualmente abierto (o null)
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// ============================================================
// Tipos
// ============================================================

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  /** Auto-dismiss en ms. 0 = no dismiss automático */
  duration?: number;
}

export type ThemeMode = 'dark' | 'light';

export interface UIState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  toasts: ToastItem[];
  activeModal: string | null;
}

// ============================================================
// Initial State
// ============================================================

/**
 * Lee el tema desde localStorage (si existe).
 * Si no hay tema guardado, usa el preferido del sistema
 * (prefers-color-scheme) o dark por defecto.
 */
function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('etribunal_theme');
  if (saved === 'light' || saved === 'dark') return saved;

  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

const initialState: UIState = {
  theme: getInitialTheme(),
  sidebarOpen: false,
  mobileMenuOpen: false,
  toasts: [],
  activeModal: null,
};

// ============================================================
// Slice
// ============================================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // --- Theme ---
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('etribunal_theme', state.theme);

      // Actualizar el atributo data-theme en el <html>
      // para que Tailwind CSS aplique las variables correctas
      document.documentElement.setAttribute('data-theme', state.theme);
    },

    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      localStorage.setItem('etribunal_theme', state.theme);
      document.documentElement.setAttribute('data-theme', state.theme);
    },

    // --- Sidebar ---
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },

    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },

    // --- Mobile Menu ---
    toggleMobileMenu(state) {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },

    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },

    // --- Toasts ---
    addToast(state, action: PayloadAction<Omit<ToastItem, 'id'>>) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      state.toasts.push({ ...action.payload, id });
    },

    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    clearToasts(state) {
      state.toasts = [];
    },

    // --- Modal ---
    setActiveModal(state, action: PayloadAction<string | null>) {
      state.activeModal = action.payload;
    },
  },
});

export const {
  toggleTheme,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  addToast,
  removeToast,
  clearToasts,
  setActiveModal,
} = uiSlice.actions;

export default uiSlice.reducer;
