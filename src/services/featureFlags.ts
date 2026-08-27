/**
 * ============================================
 * services/featureFlags.ts — Feature Flags
 * ============================================
 *
 * ¿Qué son los feature flags?
 *   Son interruptores que permiten activar/desactivar
 *   funcionalidades sin hacer deploy. Útiles para:
 *   - Lanzamientos graduales (canary releases)
 *   - Funcionalidades en beta
 *   - Desactivar características inestables
 *
 * ¿Cómo se usan?
 *   Las flags se definen en .env como VITE_* y se leen
 *   a través de import.meta.env. Así se pueden cambiar
 *   sin modificar código.
 *
 * Flags actuales:
 *   ENABLE_TRANSLATIONS = habilita botones de traducción
 *     - Dev:  true  (VITE_ENABLE_TRANSLATIONS=true)
 *     - Prod: false (VITE_ENABLE_TRANSLATIONS=false)
 */

/**
 * Habilita o deshabilita los botones de traducción
 * en CaseDetail y Comment.
 *
 * Cuando es false, los componentes NO renderizan
 * el botón "Translate", aunque el backend lo soporte.
 */
export const ENABLE_TRANSLATIONS =
  import.meta.env.VITE_ENABLE_TRANSLATIONS === 'true';
