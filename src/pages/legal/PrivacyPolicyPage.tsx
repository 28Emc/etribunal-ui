import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, FileText, Share2, ShieldCheck, EyeOff, Lock } from 'lucide-react';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';

export const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();
  const sections = [
    {
      titleKey: 'legal.privacySection1',
      contentKey: 'legal.privacySection1Content',
      icon: Database
    },
    {
      titleKey: 'legal.privacySection2',
      contentKey: 'legal.privacySection2Content',
      icon: FileText
    },
    {
      titleKey: 'legal.privacySection3',
      contentKey: 'legal.privacySection3Content',
      icon: Share2
    },
    {
      titleKey: 'legal.privacySection4',
      contentKey: 'legal.privacySection4Content',
      icon: ShieldCheck
    },
    {
      titleKey: 'legal.privacySection5',
      contentKey: 'legal.privacySection5Content',
      icon: EyeOff
    },
    {
      titleKey: 'legal.privacySection6',
      contentKey: 'legal.privacySection6Content',
      icon: Lock
    }
  ];

  return (
    <PageLayout title={t('legal.privacy')}>
      <SEO title={t('legal.privacy')} />
      <div className="flex-1 py-8 space-y-12 pb-32">
        <div className="space-y-4">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-text-main">
            {t('legal.privacyPolicy')}
          </h2>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
            {t('legal.effectiveDate')}: {t('legal.privacyDate')}
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <section.icon className="w-4 h-4 text-secondary" />
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
            {t('legal.privacyText.footer')}
          </p>
        </div>
      </div>
    </PageLayout>
  );
};
