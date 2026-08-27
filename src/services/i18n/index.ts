/**
 * ============================================
 * services/i18n/index.ts — Configuración de i18next
 * ============================================
 *
 * ¿Qué hace?
 *   Inicializa i18next con:
 *   - Detector automático de idioma (localStorage → navigator)
 *   - Fallback a español
 *   - Soporte para español e inglés
 *   - Cache del idioma seleccionado en localStorage
 *
 * ¿Cómo se usa?
 *   En componentes:
 *     import { useTranslation } from 'react-i18next';
 *     const { t } = useTranslation();
 *     t('common.save') // → "Guardar" o "Save"
 *
 *   En servicios/helpers:
 *     import i18n from '@services/i18n';
 *     i18n.t('time.justNow')
 *
 * Detector de idioma (orden de resolución):
 *   1. localStorage.getItem('i18nextLng')
 *   2. navigator.language del navegador
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './es.json';
import en from './en.json';

const resources = {
  es: { translation: es },
  en: { translation: en },
};

i18n
  // 1. Detector de idioma del navegador
  .use(LanguageDetector)

  // 2. Bindings para React (useTranslation hook)
  .use(initReactI18next)

  // 3. Inicialización
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    react: {
      useSuspense: false, // No usar Suspense para carga de traducciones
    },
    interpolation: {
      escapeValue: false, // React ya escapa valores por defecto
    },
    detection: {
      // Orden de resolución del idioma
      order: ['localStorage', 'navigator'],
      // Cachear la selección en localStorage
      caches: ['localStorage'],
    },
  });

export default i18n;
