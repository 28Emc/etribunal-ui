import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, CaseCardSkeleton, UserCardSkeleton, FeedSkeleton, CaseDetailSkeleton, TrendingCaseSkeleton } from './Skeleton';

describe('Skeleton', () => {
  it('debería renderizar', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería aceptar className', () => {
    const { container } = render(<Skeleton className="w-10 h-10" />);
    expect(container.firstChild).toHaveClass('w-10 h-10');
  });

  it('debería tener clases por defecto', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});

describe('CaseCardSkeleton', () => {
  it('debería renderizar', () => {
    const { container } = render(<CaseCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('debería contener Skeleton hijos', () => {
    const { container } = render(<CaseCardSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(3);
  });
});

describe('UserCardSkeleton', () => {
  it('debería renderizar', () => {
    const { container } = render(<UserCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('FeedSkeleton', () => {
  it('debería renderizar 3 CaseCardSkeleton', () => {
    const { container } = render(<FeedSkeleton />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});

describe('CaseDetailSkeleton', () => {
  it('debería renderizar', () => {
    const { container } = render(<CaseDetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('TrendingCaseSkeleton', () => {
  it('debería renderizar', () => {
    const { container } = render(<TrendingCaseSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
