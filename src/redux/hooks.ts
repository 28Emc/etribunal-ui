/**
 * ============================================
 * redux/hooks.ts — Hooks tipados para Redux
 * ============================================
 *
 * ¿Por qué hooks personalizados?
 *   useDispatch y useSelector de react-redux no tienen
 *   información de tipos por defecto. Cada vez que los
 *   usas tendrías que escribir:
 *     useDispatch<AppDispatch>()
 *     useSelector<RootState>(selector)
 *
 *   Con estos hooks pre-tipados, los componentes pueden
 *   hacer:
 *     const dispatch = useAppDispatch();
 *     const user = useAppSelector(state => state.auth.user);
 *
 *   Sin necesidad de tipar cada uso.
 *
 * Uso:
 *   import { useAppDispatch, useAppSelector } from '@redux/hooks';
 */

import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Hook dispatch tipado. Sabe que puede recibir acciones
 * síncronas y thunks asíncronos.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Hook selector tipado. Infiere el tipo del estado global
 * y retorna el tipo del selector automáticamente.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
