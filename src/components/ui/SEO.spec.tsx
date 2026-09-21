import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { Seo } from './SEO';

describe('Seo', () => {
  it('renders default title and social metadata', () => {
    render(
      <HelmetProvider>
        <Seo />
      </HelmetProvider>
    );

    expect(document.title).toBe('eTRIBUNAL — Justicia Colaborativa');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Voz. Debate. Sentencia'
    );
    expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    expect(document.head.querySelector('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image'
    );
  });

  it('renders custom metadata, URL and JSON-LD structured data', async () => {
    const jsonLd = {
      '@context': 'https://schema.org' as const,
      '@type': 'Article',
      headline: 'A collaborative ruling',
    };

    const helmetContext = {};
    render(
      <HelmetProvider context={helmetContext}>
        <Seo
          title="Case 42"
          description="A case description"
          image="https://cdn.example.com/case.png"
          url="https://etribunal.example.com/cases/42"
          jsonLd={jsonLd}
        />
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(document.title).toBe('Case 42 | eTRIBUNAL');
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
        'content',
        'A case description'
      );
      expect(document.head.querySelector('meta[property="og:url"]')).toHaveAttribute(
        'content',
        'https://etribunal.example.com/cases/42'
      );
      expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'https://cdn.example.com/case.png'
      );
      expect(helmetContext).toBeDefined();
    });
  });
});
