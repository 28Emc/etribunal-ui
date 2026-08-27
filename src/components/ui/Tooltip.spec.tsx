import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, className, style, ...props }: any) =>
      <div className={className} style={style} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería renderizar el children', () => {
    render(
      <Tooltip content="tooltip text">
        <button data-testid="trigger">Hover me</button>
      </Tooltip>
    );
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('debería mostrar el tooltip al hacer foco', () => {
    render(
      <Tooltip content="Help text">
        <button data-testid="trigger">Focus</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    act(() => { trigger.focus(); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });

  it('debería ocultar el tooltip al perder foco', () => {
    render(
      <Tooltip content="Help text">
        <button data-testid="trigger">Focus</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    act(() => { trigger.focus(); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Help text')).toBeInTheDocument();
    act(() => { trigger.blur(); });
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });

  it('debería respetar el delay configurado', () => {
    render(
      <Tooltip content="Delayed" delay={500}>
        <button data-testid="trigger">Delay</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    act(() => { trigger.focus(); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText('Delayed')).toBeInTheDocument();
  });

  it('debería mostrar tooltip al hacer mouse enter', () => {
    render(
      <Tooltip content="Mouse tip">
        <button data-testid="trigger">Hover</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Mouse tip')).toBeInTheDocument();
  });

  it('debería ocultar tooltip al hacer mouse leave', () => {
    render(
      <Tooltip content="Mouse tip">
        <button data-testid="trigger">Hover</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Mouse tip')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText('Mouse tip')).not.toBeInTheDocument();
  });

  it('debería renderizar con diferentes posiciones', () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const;
    for (const pos of positions) {
      const { unmount } = render(
        <Tooltip content={`${pos} tip`} position={pos}>
          <button>Btn</button>
        </Tooltip>
      );
      const trigger = screen.getByText('Btn');
      fireEvent.focus(trigger);
      act(() => { vi.advanceTimersByTime(200); });
      expect(screen.getByText(`${pos} tip`)).toBeInTheDocument();
      unmount();
    }
  });

  it('debería aplicar className al tooltip', () => {
    render(
      <Tooltip content="Styled" className="custom-class">
        <button data-testid="trigger">Btn</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    fireEvent.focus(trigger);
    act(() => { vi.advanceTimersByTime(200); });
    const tooltipEl = screen.getByText('Styled').closest('.custom-class');
    expect(tooltipEl).toBeInTheDocument();
  });

  it('debería alternar en touch device al hacer click', () => {
    const origTouchStart = 'ontouchstart' in window;
    Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true, configurable: true });

    render(
      <Tooltip content="Touch tip">
        <button data-testid="trigger">Touch</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByText('Touch tip')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByText('Touch tip')).not.toBeInTheDocument();

    delete (window as any).ontouchstart;
  });

  it('debería limpiar timeout activo al desmontar', () => {
    const { unmount } = render(
      <Tooltip content="Cleanup" delay={500}>
        <button data-testid="trigger">Btn</button>
      </Tooltip>
    );
    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger);
    unmount();
  });

});
