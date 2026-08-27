/**
 * ============================================
 * main.tsx — Entry Point
 * ============================================
 *
 * Punto de entrada de la aplicación.
 * Solo monta el componente <App /> dentro de <StrictMode>.
 *
 * La inicialización de i18n se hace como side-effect importando
 * '@services/i18n' (se agregará en Phase 01).
 *
 * StrictMode solo aplica en desarrollo; en producción se comporta
 * como un Fragment.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@services/i18n';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
