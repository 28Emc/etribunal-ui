import { describe, it, expect } from 'vitest';
import { ENABLE_TRANSLATIONS } from './featureFlags';

describe('featureFlags', () => {
  it('ENABLE_TRANSLATIONS debería ser un booleano', () => {
    expect(typeof ENABLE_TRANSLATIONS).toBe('boolean');
  });

  it('ENABLE_TRANSLATIONS debería definirse correctamente', () => {
    // El valor depende de VITE_ENABLE_TRANSLATIONS en el entorno de test
    expect(ENABLE_TRANSLATIONS).toBeTypeOf('boolean');
  });
});
