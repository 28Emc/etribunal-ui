import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ModalErrorBoundary } from './ErrorBoundary';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  it('debería renderizar children sin error', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Children</div>
      </ErrorBoundary>
    );
    expect(container.textContent).toBe('Children');
  });

  it('debería capturar error y mostrar fallback por defecto', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('debería llamar onError callback', () => {
    const onError = vi.fn();
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });

  it('debería renderizar fallback personalizado', () => {
    const ThrowError = () => { throw new Error('Test error'); };
    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
  });

  it('debería mostrar el mensaje de error en el DOM', () => {
    const ThrowError = () => { throw new Error('Mensaje de error específico'); };
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Mensaje de error específico')).toBeInTheDocument();
  });

  it('debería renderizar ModalErrorBoundary sin onClose', () => {
    const ThrowError = () => { throw new Error('Test error'); };
    render(
      <ModalErrorBoundary>
        <ThrowError />
      </ModalErrorBoundary>
    );
    expect(screen.getByText('Error al cargar')).toBeInTheDocument();
  });

  it('debería resetear estado al hacer click en Reintentar', () => {
    let shouldThrow = true;
    const ThrowError = () => {
      if (shouldThrow) throw new Error('Test error');
      return <div>Recovered</div>;
    };
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByText('Reintentar'));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('debería recargar página al hacer click en Recargar página', () => {
    const { reload } = window.location;
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });
    const ThrowError = () => { throw new Error('Test error'); };
    render(
      <ModalErrorBoundary>
        <ThrowError />
      </ModalErrorBoundary>
    );
    fireEvent.click(screen.getByText('Recargar página'));
    expect(mockReload).toHaveBeenCalled();
    Object.defineProperty(window, 'location', {
      value: { reload },
      writable: true,
    });
  });
});
