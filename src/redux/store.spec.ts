import { describe, it, expect } from 'vitest';
import { store } from './store';

describe('redux store', () => {
  it('debería crear el store con los slices esperados', () => {
    const state = store.getState();

    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('casesApi');
    expect(state).toHaveProperty('commentsApi');
    expect(state).toHaveProperty('ui');
  });

  it('auth slice debería tener estado inicial', () => {
    const { auth } = store.getState();
    expect(auth).toHaveProperty('user');
    expect(auth).toHaveProperty('isAuthenticated');
    expect(auth).toHaveProperty('isLoading');
  });

  it('casesApi y commentsApi deberían estar registrados en el store', () => {
    const { casesApi, commentsApi } = store.getState();
    expect(casesApi).toHaveProperty('queries');
    expect(casesApi).toHaveProperty('mutations');
    expect(casesApi).toHaveProperty('config');
    expect(commentsApi).toHaveProperty('queries');
    expect(commentsApi).toHaveProperty('mutations');
    expect(commentsApi).toHaveProperty('config');
  });

  it('ui slice debería tener estado inicial', () => {
    const { ui } = store.getState();
    expect(ui).toHaveProperty('theme');
    expect(ui).toHaveProperty('sidebarOpen');
    expect(ui).toHaveProperty('toasts');
    expect(ui).toHaveProperty('activeModal');
  });

  it('debería exportar tipos RootState y AppDispatch', () => {
    const state = store.getState();
    const dispatch = store.dispatch;

    expect(typeof dispatch).toBe('function');
    expect(typeof state).toBe('object');
  });
});
