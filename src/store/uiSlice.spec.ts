import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import uiReducer, {
  toggleSidebar,
  setSidebarOpen,
  toggleTheme,
  setTheme,
  toggleMobileMenu,
  setMobileMenuOpen,
  addToast,
  removeToast,
  clearToasts,
  setActiveModal,
} from '../redux/slices/uiSlice';

describe('uiSlice', () => {
  let initialState: ReturnType<typeof uiReducer>;

  beforeEach(() => {
    initialState = uiReducer(undefined, { type: 'unknown' });
  });

  describe('reducer', () => {
    it('debería retornar el estado inicial', () => {
      expect(initialState.sidebarOpen).toBe(false);
      expect(initialState.theme).toBeDefined();
      expect(initialState.toasts).toEqual([]);
      expect(initialState.activeModal).toBeNull();
    });

    it('toggleSidebar debería invertir sidebarOpen', () => {
      const state1 = uiReducer(initialState, toggleSidebar());
      expect(state1.sidebarOpen).toBe(true);

      const state2 = uiReducer(state1, toggleSidebar());
      expect(state2.sidebarOpen).toBe(false);
    });

    it('setSidebarOpen debería establecer sidebarOpen', () => {
      const state = uiReducer(initialState, setSidebarOpen(true));
      expect(state.sidebarOpen).toBe(true);
    });

    it('toggleTheme debería cambiar de dark a light y viceversa', () => {
      const state1 = uiReducer(initialState, toggleTheme());
      expect(state1.theme).toBe(initialState.theme === 'dark' ? 'light' : 'dark');

      const state2 = uiReducer(state1, toggleTheme());
      expect(state2.theme).toBe(initialState.theme);
    });

    it('setTheme debería establecer el tema especificado', () => {
      const target = initialState.theme === 'dark' ? 'light' : 'dark';
      const state = uiReducer(initialState, setTheme(target));
      expect(state.theme).toBe(target);
    });

    it('toggleMobileMenu debería invertir mobileMenuOpen', () => {
      const state1 = uiReducer(initialState, toggleMobileMenu());
      expect(state1.mobileMenuOpen).toBe(true);

      const state2 = uiReducer(state1, toggleMobileMenu());
      expect(state2.mobileMenuOpen).toBe(false);
    });

    it('setMobileMenuOpen debería establecer mobileMenuOpen', () => {
      const state = uiReducer(initialState, setMobileMenuOpen(true));
      expect(state.mobileMenuOpen).toBe(true);
    });

    describe('toasts', () => {
      it('addToast debería agregar un toast con id', () => {
        const state = uiReducer(initialState, addToast({ type: 'success', message: 'OK' }));
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0].message).toBe('OK');
        expect(state.toasts[0].type).toBe('success');
        expect(state.toasts[0].id).toBeDefined();
      });

      it('removeToast debería eliminar un toast por id', () => {
        const withToast = uiReducer(initialState, addToast({ type: 'error', message: 'Err' }));
        const id = withToast.toasts[0].id;
        const withoutToast = uiReducer(withToast, removeToast(id));
        expect(withoutToast.toasts).toHaveLength(0);
      });

      it('clearToasts debería eliminar todos los toasts', () => {
        const withToasts = uiReducer(
          initialState,
          addToast({ type: 'info', message: 'A' }),
        );
        const withTwo = uiReducer(withToasts, addToast({ type: 'warning', message: 'B' }));
        const cleared = uiReducer(withTwo, clearToasts());
        expect(cleared.toasts).toHaveLength(0);
      });
    });

    it('setActiveModal debería establecer activeModal', () => {
      const state = uiReducer(initialState, setActiveModal('login'));
      expect(state.activeModal).toBe('login');

      const cleared = uiReducer(state, setActiveModal(null));
      expect(cleared.activeModal).toBeNull();
    });
  });
});
