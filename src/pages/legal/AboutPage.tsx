import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Users, Scale, Heart, Zap } from 'lucide-react';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  const features = [
    {
      titleKey: 'legal.aboutContent.feature1.title',
      descriptionKey: 'legal.aboutContent.feature1.description',
      icon: Scale
    },
    {
      titleKey: 'legal.aboutContent.feature2.title',
      descriptionKey: 'legal.aboutContent.feature2.description',
      icon: Users
    },
    {
      titleKey: 'legal.aboutContent.feature3.title',
      descriptionKey: 'legal.aboutContent.feature3.description',
      icon: Heart
    },
    {
      titleKey: 'legal.aboutContent.feature4.title',
      descriptionKey: 'legal.aboutContent.feature4.description',
      icon: Zap
    }
  ];

  return (
    <PageLayout title={t('legal.about')}>
      <SEO title={t('legal.about')} />
      <div className="flex-1 py-8 space-y-12 pb-32">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-text-main">
            {t('legal.aboutVeridixo')}
          </h2>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
            {t('legal.version')} 1.0.0 • 2026
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-text-muted leading-relaxed font-medium">
            {t('legal.aboutContent.intro1')}
          </p>
          <p className="text-sm text-text-muted leading-relaxed font-medium">
            {t('legal.aboutContent.intro2')}
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-text-main">
            {t('legal.whatWeOffer')}
          </h3>
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-background rounded-2xl border border-border-main/10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-text-main mb-1">
                    {t(feature.titleKey)}
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-10 border-t border-border-main/10">
          <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest leading-loose text-center">
            {t('legal.copyright')}
          </p>
        </div>
      </div>
    </PageLayout>
  );
};
