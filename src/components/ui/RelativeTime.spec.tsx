import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelativeTime } from './RelativeTime';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'time.justNow': 'just now',
        'time.minutesAgo': '{{count}} min ago',
        'time.hoursAgo': '{{count}} hr ago',
        'time.daysAgo': '{{count}} days ago',
      };
      const text = translations[key] || key;
      if (options?.count) return text.replace('{{count}}', String(options.count));
      return text;
    },
    i18n: { language: 'en' },
  }),
}));

describe('RelativeTime', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('debería renderizar "just now" para tiempo reciente', () => {
    const now = new Date().toISOString();
    render(<RelativeTime value={now} />);
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('debería renderizar fecha formateada para más de 7 días', () => {
    const oldDate = new Date(Date.now() - 8 * 86_400_000).toISOString();
    render(<RelativeTime value={oldDate} />);
    expect(screen.getByText(/[A-Z][a-z]{2}/)).toBeInTheDocument();
  });

  it('debería manejar string de fecha inválido', () => {
    render(<RelativeTime value="invalid-date" />);
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
  });

  it('debería renderizar "X min ago" para minutos', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    render(<RelativeTime value={fiveMinAgo} />);
    expect(screen.getByText('5 min ago')).toBeInTheDocument();
  });

  it('debería renderizar "X hr ago" para horas', () => {
    const twoHrAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    render(<RelativeTime value={twoHrAgo} />);
    expect(screen.getByText('2 hr ago')).toBeInTheDocument();
  });

  it('debería renderizar "X days ago" para días', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(<RelativeTime value={threeDaysAgo} />);
    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });
});
