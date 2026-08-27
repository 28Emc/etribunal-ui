import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReactionIcon, getReactionColor, getReactionBgColor, getReactionBorderColor } from './ReactionIcon';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('ReactionIcon', () => {
  it('debería renderizar LIKE', () => {
    const { container } = render(<ReactionIcon type="LIKE" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería renderizar con tamaño sm', () => {
    const { container } = render(<ReactionIcon type="LIKE" size="sm" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería renderizar con tamaño lg', () => {
    const { container } = render(<ReactionIcon type="LOVE" size="lg" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería renderizar ANGRY', () => {
    const { container } = render(<ReactionIcon type="ANGRY" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería aplicar fill cuando filled=true', () => {
    const { container } = render(<ReactionIcon type="LIKE" filled />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('fill-current')).toBe(true);
  });

  it('debería usar colores light cuando data-theme=light', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const { container } = render(<ReactionIcon type="LIKE" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('text-blue-700')).toBe(true);
  });
});

describe('getReactionColor', () => {
  it('debería retornar color dark para LIKE', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionColor('LIKE')).toBe('text-blue-400');
  });

  it('debería retornar color dark para LOVE', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionColor('LOVE')).toBe('text-pink-400');
  });

  it('debería retornar color dark para ANGRY', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionColor('ANGRY')).toBe('text-red-400');
  });

  it('debería retornar color light para LIKE', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionColor('LIKE')).toBe('text-blue-700');
  });

  it('debería retornar color light para LOVE', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionColor('LOVE')).toBe('text-pink-700');
  });

  it('debería retornar color light para ANGRY', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionColor('ANGRY')).toBe('text-red-700');
  });
});

describe('getReactionBgColor', () => {
  it('debería retornar background dark para LIKE', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionBgColor('LIKE')).toBe('bg-blue-400/20');
  });

  it('debería retornar background dark para LOVE', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionBgColor('LOVE')).toBe('bg-pink-400/20');
  });

  it('debería retornar background dark para ANGRY', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionBgColor('ANGRY')).toBe('bg-red-400/20');
  });

  it('debería retornar background light para LIKE', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionBgColor('LIKE')).toBe('bg-blue-700/20');
  });

  it('debería retornar background light para LOVE', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionBgColor('LOVE')).toBe('bg-pink-700/20');
  });

  it('debería retornar background light para ANGRY', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionBgColor('ANGRY')).toBe('bg-red-700/20');
  });
});

describe('getReactionBorderColor', () => {
  it('debería retornar border dark para LIKE', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionBorderColor('LIKE')).toBe('border-blue-400');
  });

  it('debería retornar border dark para LOVE', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionBorderColor('LOVE')).toBe('border-pink-400');
  });

  it('debería retornar border dark para ANGRY', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getReactionBorderColor('ANGRY')).toBe('border-red-400');
  });

  it('debería retornar border light para LIKE', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionBorderColor('LIKE')).toBe('border-blue-700');
  });

  it('debería retornar border light para LOVE', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionBorderColor('LOVE')).toBe('border-pink-700');
  });

  it('debería retornar border light para ANGRY', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(getReactionBorderColor('ANGRY')).toBe('border-red-700');
  });
});
