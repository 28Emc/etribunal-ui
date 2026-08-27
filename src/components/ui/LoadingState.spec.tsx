import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingState, EmptyState, ErrorState, LoadingSkeleton } from './LoadingState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('LoadingState', () => {
  it('debería renderizar', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería renderizar con skeleton loaders', () => {
    const { container } = render(<LoadingState />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('EmptyState', () => {
  it('debería renderizar', () => {
    const { container } = render(<EmptyState titleKey="No hay datos" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería renderizar con icono personalizado', () => {
    const CustomIcon = () => <div data-testid="custom-icon">*</div>;
    render(<EmptyState icon={<CustomIcon />} titleKey="Sin resultados" />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('debería renderizar sin botón de reintento', () => {
    render(<ErrorState message="Algo salió mal" />);
    expect(screen.getByText('common.error')).toBeInTheDocument();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.queryByText('common.retry')).not.toBeInTheDocument();
  });

  it('debería renderizar con botón de reintento', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Algo salió mal" onRetry={onRetry} />);
    expect(screen.getByText('common.retry')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('LoadingSkeleton', () => {
  it('debería renderizar correctamente', () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
