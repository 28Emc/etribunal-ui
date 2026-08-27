/**
 * ============================================
 * setupTests.ts — Configuración global de tests
 * ============================================
 *
 * Se ejecuta antes de cada archivo de test gracias
 * a la configuración en vite.config.ts:
 *   setupFiles: ['./src/setupTests.ts']
 *
 * Agrega los matchers de jest-dom (toBeInTheDocument,
 * toHaveClass, etc.) a los tests de vitest.
 */

import '@testing-library/jest-dom';
