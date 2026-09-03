/**
 * ============================================
 * api/automation.ts — Cliente del Motor de IA
 * ============================================
 *
 * Tipos y funciones para consumir los endpoints admin del motor de
 * automatización IA del backend (servicio `ai-engine`):
 *
 *   GET  /automation/settings      Config de negocio (BD-primero)
 *   PUT  /automation/settings      Actualizar config de negocio
 *   GET  /automation/engagement    Resumen de engagement de casos IA
 *   GET  /automation/runs          Historial de runs
 *   GET  /automation/runs/:id      Detalle de un run
 *   POST /automation/run           Disparar run manual (async)
 *   GET  /automation/queue         Estado de la cola de interacciones
 *
 * El backend valida el rol vía el header `X-Roles` que el gateway
 * inyecta tras validar el JWT. Aquí solo hacemos calls autenticadas.
 */

import { apiClient } from '@api/client';

// ============================================================
// Tipos
// ============================================================

/** Configuración efectiva del motor (resultado de GET/PUT /settings) */
export interface AutomationSettings {
  enabled: boolean;
  dryRun: boolean;
  runHour: number;
  language: string;
  dailyCasesMin: number;
  dailyCasesMax: number;
  usersPerCaseMin: number;
  usersPerCaseMax: number;
  maxInteractionsPerUserPerCaseMin: number;
  maxInteractionsPerUserPerCaseMax: number;
  intensityMin: number;
  intensityMax: number;
  schedulingIntervalMin: number;
  schedulingIntervalMax: number;
  schedulingWindowHours: number;
  dailyPoolSize: number;
  activityWeighted: boolean;
  engagementEnabled: boolean;
  engagementWeights: {
    votes: number;
    comments: number;
    reactions: number;
    shares: number;
    saves: number;
    views: number;
  };
  engagementTopExamples: number;
  engagementEvaluationDays: number;
  rssFeedUrls: string[];
}

/** Historial / detalle de un run de automatización */
export interface AutomationRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  dryRun: boolean;
  casesRequested: number;
  casesCreated: number;
  casesFailed: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
}

/** Respuesta asíncrona de POST /run */
export interface AutomationRunTrigger {
  runId: string;
  started: boolean;
  status: string;
  pollingUrl?: string;
}

/** Estado de la cola de interacciones */
export interface AutomationQueueStatus {
  scheduled: number;
  processing: number;
  completedToday: number;
  failedToday: number;
}

/** Rendimiento individual de un caso generado por IA */
export interface AutomationCasePerformance {
  caseId: string;
  title: string;
  engagementScore: number;
  votes: number;
  comments: number;
  reactions: number;
  shares: number;
  saves: number;
  views: number;
  evaluationDate: string;
}

/** Resumen de engagement para el panel admin */
export interface AutomationEngagement {
  evaluatedCases: number;
  averageScore: number;
  topCases: AutomationCasePerformance[];
}

// ============================================================
// Funciones de acceso
// ============================================================

export async function fetchAutomationSettings(): Promise<AutomationSettings> {
  return (await apiClient.get('/automation/settings')) as AutomationSettings;
}

export async function updateAutomationSettings(
  changes: Record<string, unknown>
): Promise<AutomationSettings> {
  return (await apiClient.put('/automation/settings', changes)) as AutomationSettings;
}

export async function fetchAutomationRuns(limit = 20): Promise<AutomationRun[]> {
  return (await apiClient.get(`/automation/runs?limit=${limit}`)) as AutomationRun[];
}

export async function fetchAutomationRun(id: string): Promise<AutomationRun> {
  return (await apiClient.get(`/automation/runs/${id}`)) as AutomationRun;
}

export async function triggerAutomationRun(
  dryRun = false
): Promise<AutomationRunTrigger> {
  return (await apiClient.post(
    `/automation/run?dryRun=${dryRun}`
  )) as AutomationRunTrigger;
}

export async function fetchAutomationQueue(): Promise<AutomationQueueStatus> {
  return (await apiClient.get('/automation/queue')) as AutomationQueueStatus;
}

export async function fetchAutomationEngagement(): Promise<AutomationEngagement> {
  return (await apiClient.get('/automation/engagement')) as AutomationEngagement;
}
