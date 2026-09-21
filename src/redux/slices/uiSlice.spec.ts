import { beforeEach, describe, expect, it, vi } from 'vitest';
import reducer, {
  addToast,
  clearToasts,
  removeToast,
  setActiveModal,
  setMobileMenuOpen,
  setSidebarOpen,
  setTheme,
  toggleMobileMenu,
  toggleSidebar,
  toggleTheme,
} from './uiSlice';

describe('uiSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'toast-1') });
  });

  it('debería alternar y persistir el tema', () => {
    const initial = reducer(undefined, setTheme('dark'));
    const light = reducer(initial, toggleTheme());

    expect(light.theme).toBe('light');
    expect(localStorage.getItem('etribunal_theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(reducer(light, toggleTheme()).theme).toBe('dark');
  });

  it('debería establecer el tema explícitamente', () => {
    const state = reducer(undefined, setTheme('light'));
    expect(state.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('debería controlar sidebar y menú móvil', () => {
    let state = reducer(undefined, toggleSidebar());
    expect(state.sidebarOpen).toBe(true);
    state = reducer(state, setSidebarOpen(false));
    expect(state.sidebarOpen).toBe(false);
    state = reducer(state, toggleMobileMenu());
    expect(state.mobileMenuOpen).toBe(true);
    expect(reducer(state, setMobileMenuOpen(false)).mobileMenuOpen).toBe(false);
  });

  it('debería añadir, eliminar y limpiar toasts', () => {
    let state = reducer(undefined, addToast({ type: 'success', message: 'Guardado' }));
    expect(state.toasts).toEqual([
      { id: 'toast-1', type: 'success', message: 'Guardado' },
    ]);
    state = reducer(state, removeToast('missing'));
    expect(state.toasts).toHaveLength(1);
    state = reducer(state, removeToast('toast-1'));
    expect(state.toasts).toHaveLength(0);
    state = reducer(state, addToast({ type: 'error', message: 'Error' }));
    expect(reducer(state, clearToasts()).toasts).toEqual([]);
  });

  it('debería actualizar el modal activo', () => {
    let state = reducer(undefined, setActiveModal('confirm-delete'));
    expect(state.activeModal).toBe('confirm-delete');
    state = reducer(state, setActiveModal(null));
    expect(state.activeModal).toBeNull();
  });
});
