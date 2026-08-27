/**
 * ============================================
 * services/anonymity.ts — Lógica de Anonimato
 * ============================================
 *
 * ¿Por qué existe?
 *   Los usuarios pueden elegir ser anónimos. En vez de mostrar
 *   su username real, se genera un identificador determinista
 *   basado en su userId. Esto permite consistencia:
 *   el mismo usuario anónimo siempre tiene el mismo hash.
 *
 * ¿Cómo funciona?
 *   1. Se toma el userId (ej: "user_abc123")
 *   2. Se calcula un hash numérico con el algoritmo djb2
 *   3. Se toman los últimos 4 dígitos del hash
 *   4. Se muestra "Anónimo #1234"
 *
 * ¿Por qué no usar Math.random()?
 *   Para que el mismo usuario anónimo sea identificable
 *   como "la misma persona anónima" a través de sesiones.
 *
 * Avatar:
 *   Se usa DiceBear Identicon con el userId como seed.
 *   Esto genera un avatar único y determinista.
 */

/**
 * Genera el nombre visible para un usuario, respetando
 * su configuración de anonimato.
 *
 * @param username - Username real (opcional)
 * @param isAnonymous - true si el usuario eligió ser anónimo
 * @param userId - ID único del usuario (para generar el hash)
 * @returns "Anónimo #1234" si es anónimo, el username si no
 */
export function getDisplayName(
  username: string | undefined,
  isAnonymous: boolean | undefined,
  userId: string | undefined
): string {
  // Si no es anónimo o no tenemos userId, mostramos el username
  if (!isAnonymous || !userId) {
    return username || 'Anonymous';
  }

  // Para usuarios anónimos: hash determinista del userId
  const hash = hashCode(userId);
  const shortHash = String(hash).slice(-4).padStart(4, '0');
  return `Anónimo #${shortHash}`;
}

/**
 * Algoritmo djb2 (Daniel J. Bernstein).
 * Convierte un string en un número entero hash.
 *
 * Es rápido, simple y produce distribución uniforme
 * para strings cortos como userIds.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char; // hash * 33 + char
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return Math.abs(hash);
}

/**
 * Genera la URL del avatar para un usuario anónimo.
 *
 * Usamos DiceBear Identicon que genera avatares
 * geométricos deterministas a partir de un seed.
 *
 * @param userId - ID del usuario (se usa como seed)
 * @returns URL del avatar SVG
 */
export function getAnonymousAvatar(userId: string | undefined): string {
  if (!userId) {
    return 'https://api.dicebear.com/7.x/identicon/svg?seed=default';
  }
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;
}
