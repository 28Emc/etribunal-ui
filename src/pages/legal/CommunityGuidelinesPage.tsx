import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, EyeOff, FileWarning, Heart, Scale } from 'lucide-react';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';

export const CommunityGuidelinesPage: React.FC = () => {
  const { t } = useTranslation();
  const rules = [
    {
      titleKey: 'legal.guidelinesContent.rule1.title',
      descriptionKey: 'legal.guidelinesContent.rule1.description',
      icon: EyeOff,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      titleKey: 'legal.guidelinesContent.rule2.title',
      descriptionKey: 'legal.guidelinesContent.rule2.description',
      icon: FileWarning,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      titleKey: 'legal.guidelinesContent.rule3.title',
      descriptionKey: 'legal.guidelinesContent.rule3.description',
      icon: ShieldAlert,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      titleKey: 'legal.guidelinesContent.rule4.title',
      descriptionKey: 'legal.guidelinesContent.rule4.description',
      icon: Heart,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  return (
    <PageLayout title={t('legal.guidelines')}>
      <SEO title={t('legal.guidelines')} />
      <div className="flex-1 py-8 space-y-12 pb-32">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-text-main">
              {t('legal.communityGuidelines')}
            </h2>
          </div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
            {t('legal.rulesOfCourt')}
          </p>
        </div>

        <div className="space-y-6">
          {rules.map((rule, i) => (
            <div
              key={i}
              className="bg-background border border-border-main/10 rounded-[32px] p-6 space-y-4 hover:bg-border-main/10 transition-all border-l-4 border-l-transparent hover:border-l-primary"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${rule.bgColor} flex items-center justify-center`}>
                  <rule.icon className={`w-6 h-6 ${rule.color}`} />
                </div>
                <h4 className="text-lg font-black uppercase tracking-tighter italic text-text-main">
                  {t(rule.titleKey)}
                </h4>
              </div>
              <p className="text-sm text-text-muted leading-relaxed font-medium">
                {t(rule.descriptionKey)}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-[32px] p-8 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <h4 className="text-sm font-black uppercase tracking-widest text-primary">
              {t('legal.enforcement')}
            </h4>
          </div>
          <p className="text-xs text-text-muted leading-relaxed font-bold uppercase tracking-wider">
            {t('legal.guidelinesContent.enforcementText')}
          </p>
        </div>
      </div>
    </PageLayout>
  );
};
