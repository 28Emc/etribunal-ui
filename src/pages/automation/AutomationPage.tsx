import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, RefreshCw, Settings2, Activity, Cpu, ChevronDown,
  Check, X, Zap, TrendingUp, Clock, ListChecks, Info, AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils/helpers';
import { useAutomation } from '@hooks/useAutomation';
import { SectionTitle } from '@components/ui/SectionTitle';
import { PageLayout } from '@layout/PageLayout';
import { SEO } from '@components/ui/SEO';
import { LoadingState, EmptyState } from '@components/ui/LoadingState';
import { useToast } from '@components/ui/Toast';
import { Tooltip } from '@shared/components/Tooltip';
import { ConfirmModal } from '@shared/components/ConfirmModal';
import type {
  AutomationCasePerformance,
} from '@api/automation';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const colorMap: Record<string, string> = {
    COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    RUNNING: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PARTIAL: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    FAILED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    CANCELLED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  };
  const key = `automation.runs.status.${status}`;
  const label = t(key, { defaultValue: status });
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border',
        colorMap[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'RUNNING'
            ? 'bg-sky-400 animate-pulse'
            : status === 'COMPLETED'
            ? 'bg-emerald-400'
            : status === 'FAILED'
            ? 'bg-rose-400'
            : 'bg-current'
        )}
      />
      {label}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const tones: Record<string, string> = {
    default: 'text-text-main',
    accent: 'text-sky-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
  };
  return (
    <div className="bg-card border border-border-main/10 rounded-2xl p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate">
          {label}
        </p>
        <p className={cn('text-2xl font-black mt-1', tones[tone])}>{value}</p>
        {hint && (
          <p className="text-[11px] text-text-muted mt-1 truncate">{hint}</p>
        )}
      </div>
      <span className="p-2.5 rounded-xl bg-white/5 shrink-0">
        <Icon className="w-4 h-4 text-text-muted" />
      </span>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-50',
        checked ? 'bg-sky-500' : 'bg-white/10'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export const AutomationPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    canManage, settings, runs, queue, engagement,
    isLoadingSettings, isLoadingRuns, isLoadingQueue, isLoadingEngagement,
    isSavingSettings, isTriggeringRun, error, saveSettings, triggerRun,
    refreshAll, clearError, loadRun, runDetail, clearRunDetail,
  } = useAutomation();
  const { addToast } = useToast();

  const [dirty, setDirty] = useState<Record<string, unknown>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);

  useEffect(() => {
    if (error) {
      addToast('error', t(error as string));
      clearError();
    }
  }, [error, addToast, clearError, t]);

  if (!canManage) {
    return (
      <PageLayout title={t('automation.title')}>
        <SEO title={t('automation.title')} />
        <div className="flex items-center justify-center h-full">
          <p className="text-text-muted text-sm px-6 text-center">
            {t('automation.accessDenied')}
          </p>
        </div>
      </PageLayout>
    );
  }

  const onChangeField = (field: string, value: unknown) => {
    setDirty((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(dirty).length === 0) {
      addToast('info', t('automation.toasts.noChanges'));
      return;
    }
    const ok = await saveSettings(dirty);
    if (ok) {
      setDirty({});
      addToast('success', t('automation.toasts.saved'));
    }
  };

  const handleTriggerRun = async (dryRun: boolean) => {
    if (!dryRun) {
      setConfirmRun(true);
      return;
    }
    const result = await triggerRun(dryRun);
    if (result) {
      addToast(
        'success',
        dryRun
          ? t('automation.toasts.runTriggeredDry')
          : t('automation.toasts.runTriggered')
      );
      setActiveRunId(result.runId);
    }
  };

  const handleConfirmRun = async () => {
    setConfirmRun(false);
    const result = await triggerRun(false);
    if (result) {
      addToast('success', t('automation.toasts.runTriggered'));
      setActiveRunId(result.runId);
    }
  };

  const handleOpenRun = async (id: string) => {
    await loadRun(id);
    setActiveRunId(id);
  };

  const topCases: AutomationCasePerformance[] = engagement?.topCases || [];
  const totalInteractionsDone = () => {
    if (!runs || runs.length === 0) return 0;
    return runs.reduce((acc, r) => acc + (r.casesCreated || 0), 0);
  };

  const dryRunCasesCreated = () => {
    if (!runs || runs.length === 0) return 0;
    return runs
      .filter(r => r.dryRun)
      .reduce((acc, r) => acc + (r.casesCreated || 0), 0);
  };

  const realCasesCreated = () => {
    if (!runs || runs.length === 0) return 0;
    return runs
      .filter(r => !r.dryRun)
      .reduce((acc, r) => acc + (r.casesCreated || 0), 0);
  };

  const countByStatus = (status: string) =>
    runs.filter((r) => r.status === status).length;

  const isLoadingAny =
    isLoadingSettings || isLoadingRuns || isLoadingQueue || isLoadingEngagement;

  const renderConfigRow = (
    label: string,
    field: string,
    type: 'number' | 'bool' | 'text' | 'array' = 'number',
    hint?: string
  ) => {
    const current = (settings as any)?.[field];
    const value = field in dirty ? (dirty as any)[field] : current;

    const labelWithHint = hint ? (
      <Tooltip content={hint} position="right" delay={150}>
        <span className="flex items-center gap-1.5 cursor-help">
          <span className="text-sm text-text-main">{label}</span>
          <Info className="w-4 h-4 text-text-muted/50 flex-shrink-0" />
        </span>
      </Tooltip>
    ) : (
      <span className="text-sm text-text-main">{label}</span>
    );

    if (type === 'bool') {
      return (
        <div className="flex items-center justify-between gap-3 py-2">
          {labelWithHint}
          <Toggle
            checked={!!value}
            onChange={(v) => onChangeField(field, v)}
          />
        </div>
      );
    }

    if (type === 'array') {
      const joined = Array.isArray(value) ? value.join('\n') : '';
      return (
        <div className="py-2">
          {labelWithHint}
          <textarea
            value={joined}
            onChange={(e) =>
              onChangeField(
                field,
                e.target.value.split('\n').filter((l) => l.trim().length > 0)
              )
            }
            rows={3}
            className="mt-2 w-full bg-white/5 border border-border-main/10 rounded-xl px-3 py-2 text-sm text-text-main outline-none focus:border-sky-500/50"
          />
        </div>
      );
    }

    return (
      <div className="py-2">
        {labelWithHint}
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChangeField(field, Number(e.target.value))}
          className="mt-2 w-full bg-white/5 border border-border-main/10 rounded-xl px-3 py-2 text-sm text-text-main outline-none focus:border-sky-500/50"
        />
      </div>
    );
  };

  const totalPendingInteractions =
    (queue?.scheduled || 0) + (queue?.processing || 0);

  return (
    <PageLayout
      title={t('automation.title')}
      rightButton={{
        icon: RefreshCw,
        onClick: () => refreshAll(),
        tooltip: t('automation.refresh'),
        className: 'text-sky-400',
      }}
      showBackButton={false}
    >
      <SEO title={t('automation.title')} />
      <div className="px-6 py-6 space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-sky-500/15">
            <Cpu className="w-5 h-5 text-sky-400" />
          </span>
          <div>
            <h1 className="text-lg font-black text-text-main">
              {t('automation.title')}
            </h1>
            <p className="text-xs text-text-muted">{t('automation.subtitle')}</p>
          </div>
        </div>

        {isLoadingAny && runs.length === 0 && !settings ? (
          <LoadingState />
        ) : (
          <>
            {/* KPIs */}
            <section>
              <SectionTitle>{t('automation.kpis')}</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  icon={Zap}
                  label={t('automation.kpi.casesCreated')}
                  value={realCasesCreated()}
                  hint={
                    <>
                      <span className="font-bold text-emerald-400/80">{t('automation.kpi.realCases')}</span>
                      {dryRunCasesCreated() > 0 && (
                        <>
                          <span className="mx-1 text-amber-400">|</span>
                          <span className="font-bold text-amber-400/80">
                            {dryRunCasesCreated()} {t('automation.kpi.dryRunCases')}
                          </span>
                        </>
                      )}
                    </>
                  }
                  tone="success"
                />
                <KpiCard
                  icon={Activity}
                  label={t('automation.kpi.totalInteractions')}
                  value={totalPendingInteractions}
                  hint={t('automation.kpi.queueHint')}
                  tone="accent"
                />
                <KpiCard
                  icon={TrendingUp}
                  label={t('automation.kpi.avgScore')}
                  value={
                    engagement?.averageScore != null
                      ? Math.round(engagement.averageScore)
                      : '—'
                  }
                  hint={
                    engagement?.evaluatedCases
                      ? `${engagement.evaluatedCases} ${t('automation.kpi.evaluated')}`
                      : t('automation.kpi.noData')
                  }
                  tone="default"
                />
                <KpiCard
                  icon={ListChecks}
                  label={t('automation.kpi.runs')}
                  value={runs.length}
                  hint={`${countByStatus('COMPLETED')} ${t('automation.kpi.completed')}`}
                  tone="default"
                />
              </div>
            </section>

            {/* Acciones */}
            <section>
              <SectionTitle>{t('automation.actions')}</SectionTitle>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleTriggerRun(false)}
                  disabled={isTriggeringRun}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isTriggeringRun ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {t('automation.runNow')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfig((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-main text-sm font-bold border border-border-main/10 transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  {t('automation.configure')}
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      showConfig && 'rotate-180'
                    )}
                  />
                </button>
              </div>
            </section>

            {/* Config editor */}
            <AnimatePresence initial={false}>
              {showConfig && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <SectionTitle>{t('automation.config')}</SectionTitle>
                  {isLoadingSettings && !settings ? (
                    <LoadingState />
                  ) : (
                    <div className="bg-card border border-border-main/10 rounded-2xl p-5 space-y-3">
                      {renderConfigRow(t('automation.enabled'), 'enabled', 'bool', t('automation.hints.enabled'))}
                      {renderConfigRow(t('automation.dryRun'), 'dryRun', 'bool', t('automation.hints.dryRun'))}
                      {renderConfigRow(
                        t('automation.activityWeighted'),
                        'activityWeighted',
                        'bool',
                        t('automation.hints.activityWeighted')
                      )}
                      {renderConfigRow(
                        t('automation.engagementEnabled'),
                        'engagementEnabled',
                        'bool',
                        t('automation.hints.engagementEnabled')
                      )}
                      <div className="h-px bg-border-main/10 my-2" />
                      {renderConfigRow(t('automation.runHour'), 'runHour', 'number', t('automation.hints.runHour'))}
                      {renderConfigRow(t('automation.dailyCasesMin'), 'dailyCasesMin', 'number', t('automation.hints.dailyCasesMin'))}
                      {renderConfigRow(t('automation.dailyCasesMax'), 'dailyCasesMax', 'number', t('automation.hints.dailyCasesMax'))}
                      {renderConfigRow(t('automation.usersPerCaseMin'), 'usersPerCaseMin', 'number', t('automation.hints.usersPerCaseMin'))}
                      {renderConfigRow(t('automation.usersPerCaseMax'), 'usersPerCaseMax', 'number', t('automation.hints.usersPerCaseMax'))}
                      {renderConfigRow(
                        t('automation.schedulingIntervalMin'),
                        'schedulingIntervalMin',
                        'number',
                        t('automation.hints.schedulingIntervalMin')
                      )}
                      {renderConfigRow(
                        t('automation.schedulingIntervalMax'),
                        'schedulingIntervalMax',
                        'number',
                        t('automation.hints.schedulingIntervalMax')
                      )}
                      {renderConfigRow(
                        t('automation.schedulingWindowHours'),
                        'schedulingWindowHours',
                        'number',
                        t('automation.hints.schedulingWindowHours')
                      )}
                      {renderConfigRow(t('automation.intensityMin'), 'intensityMin', 'number', t('automation.hints.intensityMin'))}
                      {renderConfigRow(t('automation.intensityMax'), 'intensityMax', 'number', t('automation.hints.intensityMax'))}
                      {renderConfigRow(t('automation.dailyPoolSize'), 'dailyPoolSize', 'number', t('automation.hints.dailyPoolSize'))}
                      <div className="h-px bg-border-main/10 my-2" />
                      {renderConfigRow(t('automation.rssFeedUrls'), 'rssFeedUrls', 'array', t('automation.hints.rssFeedUrls'))}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isSavingSettings || Object.keys(dirty).length === 0}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {isSavingSettings ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          {t('automation.save')}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            {/* Engagement */}
            <section>
              <SectionTitle>{t('automation.engagement')}</SectionTitle>
              {isLoadingEngagement && !engagement ? (
                <LoadingState />
              ) : topCases.length === 0 ? (
                <EmptyState titleKey="automation.noEngagement" />
              ) : (
                <div className="bg-card border border-border-main/10 rounded-2xl overflow-hidden">
                  <ul className="divide-y divide-border-main/10">
                    {topCases.map((c) => (
                      <li
                        key={c.caseId}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-main truncate">
                            {c.title || c.caseId}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            {c.votes} {t('automation.metrics.votes')} ·{' '}
                            {c.comments} {t('automation.metrics.comments')} ·{' '}
                            {c.reactions} {t('automation.metrics.reactions')} ·{' '}
                            {c.shares} {t('automation.metrics.shares')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-emerald-400">
                            {c.engagementScore}
                          </p>
                          <p className="text-[10px] text-text-muted uppercase tracking-wider">
                            {t('automation.metrics.score')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Queue */}
            <section>
              <SectionTitle>{t('automation.queueTitle')}</SectionTitle>
              {isLoadingQueue && !queue ? (
                <LoadingState />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard
                    icon={Clock}
                    label={t('automation.queueMetrics.scheduled')}
                    value={queue?.scheduled ?? 0}
                  />
                  <KpiCard
                    icon={Activity}
                    label={t('automation.queueMetrics.processing')}
                    value={queue?.processing ?? 0}
                  />
                  <KpiCard
                    icon={Check}
                    label={t('automation.queueMetrics.completedToday')}
                    value={queue?.completedToday ?? 0}
                    tone="success"
                  />
                  <KpiCard
                    icon={X}
                    label={t('automation.queueMetrics.failedToday')}
                    value={queue?.failedToday ?? 0}
                    tone="warning"
                  />
                </div>
              )}
            </section>

            {/* Run history */}
            <section>
              <SectionTitle>{t('automation.history')}</SectionTitle>
              {isLoadingRuns && !runs.length ? (
                <LoadingState />
              ) : runs.length === 0 ? (
                <EmptyState titleKey="automation.noRuns" />
              ) : (
                <div className="bg-card border border-border-main/10 rounded-2xl overflow-hidden">
                  <ul className="divide-y divide-border-main/10">
                    {runs.map((run) => (
                      <li
                        key={run.id}
                        className="px-4 py-3 hover:bg-white/5 cursor-pointer"
                        onClick={() => handleOpenRun(run.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-text-main truncate">
                                {String(run.id).slice(0, 8)}
                                {run.dryRun && (
                                  <span className="ml-2 text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                                    dry
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                {run.casesCreated}/{run.casesRequested}{' '}
                                {t('automation.metrics.cases')} ·{' '}
                                {formatWhen(run.startedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={run.status} />
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Run detail */}
            <AnimatePresence>
              {runDetail && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center"
                  onClick={() => {
                    setActiveRunId(null);
                    clearRunDetail();
                  }}
                >
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-card border border-border-main/10 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-black text-text-main uppercase tracking-wider">
                        {t('automation.runDetail')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRunId(null);
                          clearRunDetail();
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 text-text-muted"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">{t('automation.runs.status.status')}</span>
                        <StatusBadge status={runDetail.status} />
                      </div>
                      <StatRow label={t('automation.metrics.casesRequested')} value={runDetail.casesRequested} />
                      <StatRow label={t('automation.metrics.casesCreated')} value={runDetail.casesCreated} />
                      <StatRow label={t('automation.metrics.casesFailed')} value={runDetail.casesFailed} />
                      <StatRow
                        label={t('automation.metrics.startedAt')}
                        value={formatWhen(runDetail.startedAt)}
                      />
                      <StatRow
                        label={t('automation.metrics.finishedAt')}
                        value={formatWhen(runDetail.finishedAt)}
                      />
                      {runDetail.errorMessage && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300">
                          {runDetail.errorMessage}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
</AnimatePresence>
           </>
         )}
       </div>
       <ConfirmModal
         isOpen={confirmRun}
         onConfirm={handleConfirmRun}
         onCancel={() => setConfirmRun(false)}
         isLoading={isTriggeringRun}
         variant="warning"
         title={t('automation.confirmRun.title')}
         message={t('automation.confirmRun.message')}
         confirmLabel={t('automation.confirmRun.confirm')}
         cancelLabel={t('automation.confirmRun.cancel')}
       />
     </PageLayout>
   );
 };

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-semibold text-text-main">{value}</span>
    </div>
  );
}

export default AutomationPage;
