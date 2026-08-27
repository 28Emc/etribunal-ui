import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Scale, AlertTriangle, Eye, MessageSquare } from 'lucide-react';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';

export const TermsAndConditionsPage: React.FC = () => {
  const { t } = useTranslation();
  const sections = [
    {
      titleKey: 'legal.termsSection1',
      contentKey: 'legal.termsSection1Content',
      icon: ShieldCheck
    },
    {
      titleKey: 'legal.termsSection2',
      contentKey: 'legal.termsSection2Content',
      icon: MessageSquare
    },
    {
      titleKey: 'legal.termsSection3',
      contentKey: 'legal.termsSection3Content',
      icon: Eye
    },
    {
      titleKey: 'legal.termsSection4',
      contentKey: 'legal.termsSection4Content',
      icon: Scale
    },
    {
      titleKey: 'legal.termsSection5',
      contentKey: 'legal.termsSection5Content',
      icon: ShieldCheck
    },
    {
      titleKey: 'legal.termsSection6',
      contentKey: 'legal.termsSection6Content',
      icon: AlertTriangle
    }
  ];

  return (
    <PageLayout title={t('legal.legal')}>
      <SEO title={t('legal.terms')} />
      <div className="flex-1 py-4 md:py-8 space-y-8 md:space-y-12 pb-32">
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-none text-text-main">
            {t('legal.termsAndConditions')}
          </h2>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
            {t('legal.lastUpdated')}: {t('legal.termsDate')}
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-text-main">
                  {t(section.titleKey)}
                </h4>
              </div>
              <p className="text-sm text-text-muted leading-relaxed font-medium">
                {t(section.contentKey)}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-10 border-t border-border-main/10">
          <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest leading-loose">
            {t('legal.termsText.footer')}
          </p>
        </div>
      </div>
    </PageLayout>
  );
};
