/**
 * ============================================
 * redux/services/rtkApiClient.ts — Base Query compartido
 * ============================================
 *
 * Un único baseQuery para las APIs RTK Query del frontend.
 * apiClient (axios con interceptor de refresh) ya unwrappe a
 * `response.data?.data ?? response.data`, así que aquí solo se
 * envuelve la llamada y se captura el error con el shape
 * { status, data } que espera RTK Query.
 */

import type { AxiosError, AxiosRequestConfig } from 'axios';
import { apiClient } from '@api/client';

export interface ApiCallArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export type RtkError = { status: number; data: string | undefined };

async function rawRequest(config: AxiosRequestConfig): Promise<unknown> {
  const instance = apiClient as unknown as {
    request<T = unknown>(cfg: AxiosRequestConfig): Promise<T>;
  };
  return instance.request(config);
}

export async function baseQuery(args: ApiCallArgs): Promise<{ data: unknown } | { error: RtkError }> {
  try {
    const data = await rawRequest({
      url: args.url,
      method: args.method ?? 'GET',
      data: args.body,
      params: args.params,
    });
    return { data };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      error: {
        status: axiosError.response?.status ?? 0,
        data: axiosError.response?.data?.message ?? axiosError.message,
      },
    };
  }
}