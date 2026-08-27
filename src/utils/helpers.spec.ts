import { describe, it, expect, vi } from 'vitest';
import { cn, formatNumber, formatRelativeCaseDate, createSlug, getCasePath, sleep } from './helpers';

vi.mock('@services/i18n', () => ({
  default: {
    language: 'es',
    t: (key: string, opts?: { count?: number }) => {
      const translations: Record<string, string> = {
        'time.justNow': 'justo ahora',
        'time.minutesAgo': `hace ${opts?.count ?? '?'} min`,
        'time.hoursAgo': `hace ${opts?.count ?? '?'}h`,
        'time.daysAgo': `hace ${opts?.count ?? '?'}d`,
      };
      return translations[key] ?? key;
    },
  },
}));

describe('cn', () => {
  it('debería combinar clases simples', () => {
    expect(cn('p-4', 'text-red-500')).toBe('p-4 text-red-500');
  });

  it('debería resolver conflictos de Tailwind', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6');
  });

  it('debería manejar clases condicionales', () => {
    expect(cn('p-4', false && 'hidden', 'm-2')).toBe('p-4 m-2');
  });

  it('debería devolver string vacío sin argumentos', () => {
    expect(cn()).toBe('');
  });
});

describe('formatNumber', () => {
  it('debería formatear números menores a 1K', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(123)).toBe('123');
    expect(formatNumber(999)).toBe('999');
  });

  it('debería formatear miles como K', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999500)).toBe('999.5K');
  });

  it('debería formatear millones como M', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(2500000)).toBe('2.5M');
    expect(formatNumber(10000000)).toBe('10M');
  });

  it('debería eliminar decimal .0', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1000000)).toBe('1M');
  });
});

describe('createSlug', () => {
  it('debería convertir a minúsculas', () => {
    expect(createSlug('Hola Mundo')).toBe('hola-mundo');
  });

  it('debería eliminar tildes y diacríticos', () => {
    expect(createSlug('¿Quién tiene la razón?')).toBe('quien-tiene-la-razon');
    expect(createSlug('Él corrió rápido')).toBe('el-corrio-rapido');
  });

  it('debería reemplazar espacios y especiales con guiones', () => {
    expect(createSlug('test   multiple   spaces')).toBe('test-multiple-spaces');
    expect(createSlug('special!@#characters')).toBe('special-characters');
  });

  it('debería limitar a 100 caracteres', () => {
    const long = 'a'.repeat(150);
    expect(createSlug(long).length).toBeLessThanOrEqual(100);
  });

  it('debería eliminar guiones al inicio y final', () => {
    expect(createSlug(' -hola- ')).toBe('hola');
  });
});

describe('getCasePath', () => {
  it('debería generar URL semántica con username y título', () => {
    const result = getCasePath({
      id: '123',
      title: '¿Quién tiene la razón?',
      sideA: { username: 'juanperez' }
    });
    expect(result).toBe('/cases/juanperez/quien-tiene-la-razon');
  });

  it('debería caer a /cases/:id si falta username', () => {
    const result = getCasePath({
      id: '123',
      title: 'Test Case',
      sideA: {}
    });
    expect(result).toBe('/cases/123');
  });

  it('debería caer a /cases/:id si falta título', () => {
    const result = getCasePath({
      id: '123',
      sideA: { username: 'juanperez' }
    });
    expect(result).toBe('/cases/123');
  });

  it('debería codificar username con caracteres especiales', () => {
    const result = getCasePath({
      id: '123',
      title: 'Test',
      sideA: { username: 'usuario ñoño' }
    });
    expect(result).toContain(encodeURIComponent('usuario ñoño'));
  });
});

describe('formatRelativeCaseDate', () => {
  it('debería retornar "justo ahora" para menos de 1 minuto', () => {
    expect(formatRelativeCaseDate(new Date().toISOString())).toBe('justo ahora');
  });

  it('debería retornar hace X min para menos de 1 hora', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeCaseDate(date.toISOString())).toBe('hace 5 min');
  });

  it('debería retornar hace Xh para menos de 24 horas', () => {
    const date = new Date(Date.now() - 3 * 3600 * 1000);
    expect(formatRelativeCaseDate(date.toISOString())).toBe('hace 3h');
  });

  it('debería retornar hace Xd para menos de 7 días', () => {
    const date = new Date(Date.now() - 2 * 86400 * 1000);
    expect(formatRelativeCaseDate(date.toISOString())).toBe('hace 2d');
  });

  it('debería retornar fecha formateada para 7+ días', () => {
    const date = new Date('2024-01-15');
    const result = formatRelativeCaseDate(date.toISOString());
    expect(result).toMatch(/\d{1,2}/);
  });

  it('debería aceptar Date object', () => {
    expect(formatRelativeCaseDate(new Date())).toBe('justo ahora');
  });

  it('debería retornar string original para fecha inválida', () => {
    expect(formatRelativeCaseDate('not-a-date')).toBe('not-a-date');
  });

  it('debería retornar string vacío para Date inválido', () => {
    expect(formatRelativeCaseDate(new Date('invalid'))).toBe('');
  });

  it('debería respetar locale para fechas antiguas', () => {
    const date = new Date('2024-01-15');
    const result = formatRelativeCaseDate(date.toISOString(), 'es');
    expect(result).toContain('ene');
  });
});

describe('sleep', () => {
  it('debería devolver una Promise', () => {
    const result = sleep(0);
    expect(result).toBeInstanceOf(Promise);
  });

  it('debería resolver después del tiempo especificado', async () => {
    const start = Date.now();
    await sleep(5);
    expect(Date.now() - start).toBeGreaterThanOrEqual(4);
  });
});
