import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useToast, ToastProvider } from './Toast';

function TestHarness() {
  const { addToast } = useToast();
  return (
    <>
      <button onClick={() => addToast('success', 'Success msg')}>AddSuccess</button>
      <button onClick={() => addToast('error', 'Error msg')}>AddError</button>
      <button onClick={() => addToast('info', 'Info msg')}>AddInfo</button>
      <button onClick={() => addToast('warning', 'Warning msg')}>AddWarning</button>
    </>
  );
}

describe('Toast', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('debería renderizar ToastProvider', () => {
    const { container } = render(
      <ToastProvider>
        <div>Test</div>
      </ToastProvider>
    );
    expect(container.textContent).toBe('Test');
  });

  it('debería renderizar toasts', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('AddSuccess'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
  });

  it('debería renderizar múltiples toasts', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('AddSuccess'));
    fireEvent.click(screen.getByText('AddError'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
    expect(screen.getByText('Error msg')).toBeInTheDocument();
  });

  it('debería renderizar todos los tipos de toast', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('AddSuccess'));
    fireEvent.click(screen.getByText('AddError'));
    fireEvent.click(screen.getByText('AddInfo'));
    fireEvent.click(screen.getByText('AddWarning'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
    expect(screen.getByText('Error msg')).toBeInTheDocument();
    expect(screen.getByText('Info msg')).toBeInTheDocument();
    expect(screen.getByText('Warning msg')).toBeInTheDocument();
  });

  it('debería remover toast al clickear close button', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('AddSuccess'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();

    const closeBtn = document.querySelector('button.text-gray-400');
    expect(closeBtn).toBeInTheDocument();
    if (closeBtn) fireEvent.click(closeBtn);
    expect(screen.queryByText('Success msg')).not.toBeInTheDocument();
  });

  it('debería lanzar error si useToast se usa fuera del provider', () => {
    expect(() => render(<TestHarness />)).toThrow('useToast must be used within a ToastProvider');
  });

  it('debería auto-remover toast después de 5 segundos', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('AddSuccess'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Success msg')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
