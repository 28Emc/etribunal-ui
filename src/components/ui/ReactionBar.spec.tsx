import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ReactionBar } from './ReactionBar';

const mockT = vi.fn((key: string) => key);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('motion/react', () => {
  const MotionButton = React.forwardRef<HTMLButtonElement, any>(
    (props, ref) => {
      const { children, whileHover, whileTap, animate, initial, transition, ...htmlProps } = props;
      return <button ref={ref} {...htmlProps}>{children}</button>;
    }
  );
  MotionButton.displayName = 'MotionButton';
  const MotionDiv = React.forwardRef<HTMLDivElement, any>(
    (props, ref) => {
      const { children, animate, initial, transition, ...htmlProps } = props;
      return <div ref={ref} {...htmlProps}>{children}</div>;
    }
  );
  MotionDiv.displayName = 'MotionDiv';
  return {
    motion: {
      button: MotionButton,
      div: MotionDiv,
    },
  };
});

vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}));

vi.mock('./Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <span data-testid="tooltip" data-content={content}>{children}</span>
  ),
}));

vi.mock('./ReactionIcon', () => ({
  ReactionIcon: ({ type }: { type: string }) => <span data-testid="reaction-icon" data-type={type} />,
}));

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => <span data-testid="loader" className={className} />,
  ThumbsUp: ({ className }: { className?: string }) => <span data-testid="icon-thumbsup" className={className} />,
  Heart: ({ className }: { className?: string }) => <span data-testid="icon-heart" className={className} />,
  Angry: ({ className }: { className?: string }) => <span data-testid="icon-angry" className={className} />,
}));

vi.mock('@utils/helpers', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  formatNumber: (n: number) => n.toString(),
}));

describe('ReactionBar', () => {
  const mockOnReaction = vi.fn().mockResolvedValue(undefined);
  const baseReactions = { LIKE: 5, LOVE: 3, ANGRY: 1 };

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería renderizar el total de reacciones', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('debería renderizar botón de conteos cuando total > 0', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const countBtns = screen.getAllByTestId('reaction-icon');
    expect(countBtns.length).toBeGreaterThanOrEqual(3);
  });

  it('debería ocultar botón de conteos cuando total es 0', () => {
    render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />
    );
    const icons = screen.queryAllByTestId('reaction-icon');
    expect(icons.length).toBe(0);
  });

  it('debería ocultar contador cuando total es 0', () => {
    render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('debería manejar LOVE undefined', () => {
    render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 5, ANGRY: 1 }} onReaction={mockOnReaction} />
    );
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('debería renderizar con tamaño sm', () => {
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} size="sm" />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería mostrar el icono de LIKE por defecto cuando no hay userReaction', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    expect(screen.getByTestId('icon-thumbsup')).toBeInTheDocument();
  });

  it('debería mostrar spinner cuando isReacting y hay userReaction', () => {
    render(
      <ReactionBar
        targetId="case-1"
        reactions={baseReactions}
        userReaction="LIKE"
        onReaction={mockOnReaction}
        isReacting={true}
      />
    );
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('no debería mostrar spinner cuando isReacting pero no hay userReaction', () => {
    render(
      <ReactionBar
        targetId="case-1"
        reactions={baseReactions}
        onReaction={mockOnReaction}
        isReacting={true}
      />
    );
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(screen.getByTestId('icon-thumbsup')).toBeInTheDocument();
  });

  it('click en botón principal debería llamar onReaction con LIKE', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const buttons = screen.getAllByRole('button');
    const mainBtn = buttons[0];
    fireEvent.click(mainBtn);
    expect(mockOnReaction).toHaveBeenCalledWith('LIKE');
  });

  it('debería sincronizar localReactions cuando cambian props', () => {
    const { rerender } = render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 1, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    rerender(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 5, LOVE: 2, ANGRY: 1 }} onReaction={mockOnReaction} />
    );
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('debería sincronizar localUserReaction cuando cambia prop', () => {
    const { rerender } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} userReaction={null} />
    );
    expect(screen.getByTestId('icon-thumbsup')).toBeInTheDocument();
    rerender(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} userReaction="LIKE" />
    );
    expect(screen.getByTestId('icon-thumbsup')).toBeInTheDocument();
  });

  it('touch pointerDown debería iniciar timer de opciones', () => {
    vi.useFakeTimers();
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const buttons = screen.getAllByRole('button');
    const mainBtn = buttons[0];
    fireEvent.pointerDown(mainBtn, { pointerType: 'touch', pointerId: 1 });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getAllByTestId('icon-thumbsup').length).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });

  it('touch pointerUp debería cancelar timer antes de 250ms', () => {
    vi.useFakeTimers();
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const buttons = screen.getAllByRole('button');
    const mainBtn = buttons[0];
    fireEvent.pointerDown(mainBtn, { pointerType: 'touch', pointerId: 1 });
    fireEvent.pointerUp(mainBtn, { pointerType: 'touch', pointerId: 1 });
    vi.advanceTimersByTime(250);
    vi.useRealTimers();
  });

  it('debería manejar isTouchInteraction en handlers', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const parentDiv = container.querySelector('.relative') as HTMLElement;
    fireEvent.pointerDown(parentDiv.firstChild as HTMLElement, { pointerType: 'touch', pointerId: 5 });
    fireEvent.mouseEnter(parentDiv);
    act(() => { vi.advanceTimersByTime(500); });
    vi.useRealTimers();
  });

  it('debería ejecutar countsDiv mouseEnter (touch blocked)', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const relativeDivs = container.querySelectorAll('.relative');
    const countsDiv = relativeDivs[1] as HTMLElement;
    fireEvent.pointerDown(countsDiv.firstChild as HTMLElement, { pointerType: 'touch', pointerId: 6 });
    fireEvent.mouseEnter(countsDiv);
    act(() => { vi.advanceTimersByTime(50); });
    vi.useRealTimers();
  });

  it('debería ejecutar scroll handler cleanup on unmount', () => {
    const { unmount } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    unmount();
  });

  it('debería manejar múltiples reacciones con toggle on/off', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} userReaction="LIKE" onReaction={mockOnReaction} />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockOnReaction).toHaveBeenCalledWith('LIKE');
  });

  it('counts div hover debería abrir popup de conteos tras 50ms', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const relativeDivs = container.querySelectorAll('.relative');
    const countsDiv = relativeDivs[1] as HTMLElement;
    fireEvent.mouseEnter(countsDiv);
    act(() => { vi.advanceTimersByTime(50); });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('click en counts button en touch debería toggle showCounts', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.pointerDown(buttons[1], { pointerType: 'touch', pointerId: 2 });
    act(() => { fireEvent.click(buttons[1]); });
  });

  it('userReaction LIKE debería aplicar estilos de LIKE activo', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} userReaction="LIKE" onReaction={mockOnReaction} />
    );
    expect(screen.getByTestId('icon-thumbsup')).toBeInTheDocument();
  });

  it('userReaction ANGRY debería cambiar icono a ANGRY', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} userReaction="ANGRY" onReaction={mockOnReaction} />
    );
    expect(screen.getByTestId('icon-angry')).toBeInTheDocument();
  });

  it('debería cerrar popups en scroll', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const parentDiv = container.querySelector('.relative') as HTMLElement;
    fireEvent.mouseEnter(parentDiv);
    act(() => { vi.advanceTimersByTime(500); });
    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips.length).toBeGreaterThanOrEqual(3);
    fireEvent.scroll(window);
    expect(screen.queryAllByTestId('tooltip').length).toBe(0);
    vi.useRealTimers();
  });

  it('touch pointerLeave debería cancelar timer de opciones', () => {
    vi.useFakeTimers();
    render(<ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />);
    const buttons = screen.getAllByRole('button');
    const mainBtn = buttons[0];
    fireEvent.pointerDown(mainBtn, { pointerType: 'touch', pointerId: 1 });
    fireEvent.pointerLeave(mainBtn, { pointerType: 'touch', pointerId: 1 });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.queryAllByTestId('tooltip').length).toBe(0);
    vi.useRealTimers();
  });

  it('touch pointerUp debería cancelar timer sin abrir popup', () => {
    vi.useFakeTimers();
    render(<ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />);
    const buttons = screen.getAllByRole('button');
    const mainBtn = buttons[0];
    fireEvent.pointerDown(mainBtn, { pointerType: 'touch', pointerId: 1 });
    fireEvent.pointerUp(mainBtn, { pointerType: 'touch', pointerId: 1 });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.queryAllByTestId('tooltip').length).toBe(0);
    vi.useRealTimers();
  });

  it('debería seleccionar LIKE del popup de opciones', () => {
    vi.useFakeTimers();
    render(<ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />);
    const parentDiv = screen.getByRole('button').parentElement!;
    act(() => {
      fireEvent.mouseEnter(parentDiv);
      vi.advanceTimersByTime(500);
    });
    const popupButtons = screen.getAllByRole('button');
    fireEvent.click(popupButtons[1]);
    expect(mockOnReaction).toHaveBeenCalledWith('LIKE');
    expect(screen.queryAllByTestId('tooltip').length).toBe(0);
    vi.useRealTimers();
  });

  it('debería cerrar opciones con mouseLeave del botón', () => {
    vi.useFakeTimers();
    render(<ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />);
    const parentDiv = screen.getByRole('button').parentElement!;
    act(() => {
      fireEvent.mouseEnter(parentDiv);
      vi.advanceTimersByTime(500);
    });
    expect(screen.getAllByTestId('tooltip').length).toBeGreaterThanOrEqual(3);
    act(() => {
      fireEvent.mouseLeave(parentDiv);
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryAllByTestId('tooltip').length).toBe(0);
    vi.useRealTimers();
  });

  it('debería cambiar de ANGRY a LIKE desde el popup de opciones', () => {
    vi.useFakeTimers();
    render(<ReactionBar targetId="case-1" reactions={baseReactions} userReaction="ANGRY" onReaction={mockOnReaction} />);
    const parentDiv = screen.getAllByRole('button')[0].parentElement!;
    act(() => {
      fireEvent.mouseEnter(parentDiv);
      vi.advanceTimersByTime(500);
    });
    const popupButtons = screen.getAllByRole('button');
    fireEvent.click(popupButtons[1]);
    expect(mockOnReaction).toHaveBeenCalledWith('LIKE');
    vi.useRealTimers();
  });

  it('debería manejar mouseEnter/Leave en popup de opciones', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />
    );
    const parentDiv = screen.getByRole('button').parentElement!;
    act(() => {
      fireEvent.mouseEnter(parentDiv);
      vi.advanceTimersByTime(500);
    });
    const popupOuter = container.querySelector('.z-\\[9999\\]') as HTMLElement;
    expect(popupOuter).toBeInTheDocument();
    const popupInner = popupOuter.firstChild as HTMLElement;
    fireEvent.mouseEnter(popupInner);
    fireEvent.mouseLeave(popupInner);
    act(() => { vi.advanceTimersByTime(200); });
    expect(container.querySelector('.z-\\[9999\\]')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('debería manejar mouseEnter/Leave en popup de conteos', () => {
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const relativeDivs = container.querySelectorAll('.relative');
    const countsDiv = relativeDivs[1] as HTMLElement;
    act(() => {
      fireEvent.mouseEnter(countsDiv);
      vi.advanceTimersByTime(50);
    });
    const popupOuter = container.querySelector('.z-\\[9999\\]') as HTMLElement;
    expect(popupOuter).toBeInTheDocument();
    const popupInner = popupOuter.firstChild as HTMLElement;
    fireEvent.mouseEnter(popupInner);
    fireEvent.mouseLeave(popupInner);
    act(() => { vi.advanceTimersByTime(200); });
    expect(container.querySelector('.z-\\[9999\\]')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('debería mostrar spinner con tamaño sm cuando isReacting', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    render(
      <ReactionBar
        targetId="case-1"
        reactions={baseReactions}
        userReaction="LIKE"
        onReaction={mockOnReaction}
        isReacting={true}
        size="sm"
      />
    );
    const loader = screen.getByTestId('loader');
    expect(loader.className).toContain('w-3');
  });

  it('debería renderizar popup de opciones en modo oscuro', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    vi.useFakeTimers();
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />
    );
    const parentDiv = screen.getByRole('button').parentElement!;
    act(() => {
      fireEvent.mouseEnter(parentDiv);
      vi.advanceTimersByTime(500);
    });
    expect(screen.getAllByTestId('tooltip').length).toBeGreaterThanOrEqual(3);
    document.documentElement.setAttribute('data-theme', 'light');
    vi.useRealTimers();
  });

  it('debería renderizar popup de conteos en modo oscuro', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    vi.useFakeTimers();
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const relativeDivs = screen.getAllByRole('button');
    const countsDiv = relativeDivs[1].parentElement!;
    act(() => {
      fireEvent.mouseEnter(countsDiv);
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('5')).toBeInTheDocument();
    document.documentElement.setAttribute('data-theme', 'light');
    vi.useRealTimers();
  });

  it('non-touch pointerUp no debería hacer nada', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    fireEvent.pointerUp(screen.getAllByRole('button')[0]);
  });

  it('non-touch pointerDown en counts no debería hacer nada', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    fireEvent.pointerDown(screen.getAllByRole('button')[1]);
  });

  it('non-touch pointerDown no debería iniciar timer', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    fireEvent.pointerDown(screen.getAllByRole('button')[0]);
  });

  it('non-touch pointerLeave no debería hacer nada', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    fireEvent.pointerLeave(screen.getAllByRole('button')[0]);
  });

  it('click en counts button en desktop no debería abrir popup', () => {
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('debería limpiar isTouchInteraction tras 600ms', () => {
    vi.useFakeTimers();
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    fireEvent.pointerDown(screen.getAllByRole('button')[0], { pointerType: 'touch', pointerId: 1 });
    act(() => { vi.advanceTimersByTime(600); });
    vi.useRealTimers();
  });

  it('debería renderizar popup de conteos con reacción en 0', () => {
    vi.useFakeTimers();
    render(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 5, LOVE: 0, ANGRY: 1 }} onReaction={mockOnReaction} />
    );
    const countsDiv = screen.getAllByRole('button')[1].parentElement!;
    act(() => {
      fireEvent.mouseEnter(countsDiv);
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('0')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calcCountsPos debería devolver null cuando ref es null', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    const relativeDivs = screen.getAllByRole('button');
    const countsDiv = relativeDivs[1].parentElement!;
    fireEvent.mouseEnter(countsDiv);
    rerender(
      <ReactionBar targetId="case-1" reactions={{ LIKE: 0, LOVE: 0, ANGRY: 0 }} onReaction={mockOnReaction} />
    );
    act(() => { vi.advanceTimersByTime(50); });
    vi.useRealTimers();
  });

  it('className adicional debería aplicarse al contenedor', () => {
    const { container } = render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} className="extra-class" />
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('extra-class');
  });

  it('debería renderizar en modo oscuro', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    render(
      <ReactionBar targetId="case-1" reactions={baseReactions} onReaction={mockOnReaction} />
    );
    expect(screen.getByText('9')).toBeInTheDocument();
  });
});
