import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryFilter } from './CategoryFilter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('CategoryFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('debería renderizar todas las categorías', () => {
    render(
      <CategoryFilter selectedCategory="All" onCategoryChange={mockOnChange} />
    );
    expect(screen.getByText('categories.all')).toBeInTheDocument();
    expect(screen.getByText('categories.relationship')).toBeInTheDocument();
    expect(screen.getByText('categories.family')).toBeInTheDocument();
  });

  it('debería llamar onCategoryChange al hacer click', () => {
    render(
      <CategoryFilter selectedCategory="All" onCategoryChange={mockOnChange} />
    );
    fireEvent.click(screen.getByText('categories.relationship'));
    expect(mockOnChange).toHaveBeenCalledWith('Relationship');
  });

  it('debería manejar categorías diferentes', () => {
    render(
      <CategoryFilter selectedCategory="Work" onCategoryChange={mockOnChange} />
    );
    expect(screen.getByText('categories.work')).toBeInTheDocument();
  });

  it('debería tener clase bg-primary en la categoría activa', () => {
    render(
      <CategoryFilter selectedCategory="Relationship" onCategoryChange={mockOnChange} />
    );
    const activeButton = screen.getByText('categories.relationship');
    expect(activeButton).toHaveClass('bg-primary');
  });

  it('debería mostrar u ocultar flechas según la posición de scroll', async () => {
    const { container } = render(
      <CategoryFilter selectedCategory="All" onCategoryChange={mockOnChange} />
    );
    const scrollContainer = container.querySelector('.overflow-x-auto')!;

    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 0, configurable: true });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(container.querySelector('.lucide-chevron-right')).toBeInTheDocument();
    });
    expect(container.querySelector('.lucide-chevron-left')).not.toBeInTheDocument();

    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 500, configurable: true });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(container.querySelector('.lucide-chevron-left')).toBeInTheDocument();
    });
    expect(container.querySelector('.lucide-chevron-right')).toBeInTheDocument();

    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 800, configurable: true });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(container.querySelector('.lucide-chevron-left')).toBeInTheDocument();
    });
    expect(container.querySelector('.lucide-chevron-right')).not.toBeInTheDocument();
  });

  it('debería desplazar contenido al hacer click en las flechas', async () => {
    const { container } = render(
      <CategoryFilter selectedCategory="All" onCategoryChange={mockOnChange} />
    );
    const scrollContainer = container.querySelector('.overflow-x-auto')!;

    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 200, configurable: true });

    const scrollBySpy = vi.fn();
    Object.defineProperty(scrollContainer, 'scrollBy', { value: scrollBySpy, configurable: true });

    fireEvent.scroll(scrollContainer);
    await waitFor(() => {
      expect(container.querySelector('.lucide-chevron-left')).toBeInTheDocument();
    });

    const rightArrow = container.querySelector('.lucide-chevron-right')?.closest('button');
    expect(rightArrow).toBeTruthy();
    fireEvent.click(rightArrow!);
    expect(scrollBySpy).toHaveBeenCalledTimes(1);
    expect(scrollBySpy.mock.calls[0][0]).toEqual({ left: 140, behavior: 'smooth' });

    const leftArrow = container.querySelector('.lucide-chevron-left')?.closest('button');
    expect(leftArrow).toBeTruthy();
    fireEvent.click(leftArrow!);
    expect(scrollBySpy).toHaveBeenCalledTimes(2);
    expect(scrollBySpy.mock.calls[1][0]).toEqual({ left: -140, behavior: 'smooth' });
  });
});
