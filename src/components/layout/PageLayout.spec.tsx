import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageLayout } from './PageLayout';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@shared/components/Tooltip', () => ({
  Tooltip: ({ children, content }: any) => (
    <div data-testid="tooltip" data-tooltip-content={content}>
      {children}
    </div>
  ),
}));

describe('PageLayout', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('debería renderizar children', () => {
    render(<PageLayout><div data-testid="child">Content</div></PageLayout>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('debería renderizar el título cuando se provee', () => {
    render(<PageLayout title="Mi Título"><div>Content</div></PageLayout>);
    expect(screen.getByText('Mi Título')).toBeInTheDocument();
  });

  it('debería ocultar la navegación con hideNav', () => {
    const { container } = render(<PageLayout hideNav><div>Content</div></PageLayout>);
    const headers = container.querySelectorAll('header');
    expect(headers).toHaveLength(0);
  });

  it('debería navegar hacia atrás al hacer clic en el botón izquierdo por defecto', () => {
    render(<PageLayout><div>Content</div></PageLayout>);
    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons[0];
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('debería renderizar rightButton como array', () => {
    render(
      <PageLayout
        rightButton={[
          { icon: () => <span data-testid="btn1">B1</span>, onClick: vi.fn(), tooltip: 'Tool 1' },
          { icon: () => <span data-testid="btn2">B2</span>, onClick: vi.fn(), tooltip: 'Tool 2' },
        ]}
      >
        <div>Content</div>
      </PageLayout>
    );
    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips).toHaveLength(3);
  });

  it('debería ejecutar onClick del rightButton', () => {
    const onClick = vi.fn();
    render(
      <PageLayout
        rightButton={{ icon: () => <span data-testid="right-icon">R</span>, onClick, tooltip: 'Right' }}
      >
        <div>Content</div>
      </PageLayout>
    );
    fireEvent.click(screen.getByTestId('right-icon'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('debería ocultar menú desplegable cuando showRightButtonMenu es false', () => {
    render(
      <PageLayout
        rightButtonMenu={<div data-testid="menu">Menu</div>}
        showRightButtonMenu={false}
      >
        <div>Content</div>
      </PageLayout>
    );
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
  });

  it('debería mostrar menú desplegable cuando showRightButtonMenu es true', () => {
    render(
      <PageLayout
        rightButtonMenu={<div data-testid="menu">Menu</div>}
        showRightButtonMenu={true}
        onCloseRightButtonMenu={vi.fn()}
      >
        <div>Content</div>
      </PageLayout>
    );
    expect(screen.getByTestId('menu')).toBeInTheDocument();
  });
});
