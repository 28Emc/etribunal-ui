import { Helmet } from 'react-helmet-async';

interface JsonLdRecord {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  jsonLd?: JsonLdRecord;
}

const SITE_NAME = 'eTRIBUNAL';
const DEFAULT_DESCRIPTION = 'Voz. Debate. Sentencia';
const DEFAULT_IMAGE = '/icons/eTribunal-logo-vertical.png';

export function SEO({ title, description, image, url, jsonLd }: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Justicia Colaborativa`;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
