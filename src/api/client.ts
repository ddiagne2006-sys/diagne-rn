import { fr } from '@/i18n/fr';

import { clearToken, getToken } from './session';
import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  fieldError(name: string): string | undefined {
    return this.fields?.[name]?.[0];
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown; timeoutMs?: number };

export const DEFAULT_TIMEOUT_MS = 30_000;

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL; // notation pointée obligatoire (remplacée au build)
  if (!base) throw new ApiError(0, 'CONFIG', fr.errors.config);
  const { timeoutMs = DEFAULT_TIMEOUT_MS, json, ...rest } = init;

  const headers = new Headers(rest.headers);
  headers.set('Accept', 'application/json');
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Token ${token}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        ...rest,
        headers,
        body: json !== undefined ? JSON.stringify(json) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = (error as Error).name === 'AbortError';
      throw new ApiError(
        0,
        aborted ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR',
        aborted ? fr.errors.timeout : fr.errors.network,
      );
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorBody>;
      if (response.status === 401) {
        await clearToken();
        onUnauthorized?.();
      }
      throw new ApiError(response.status, body.code ?? 'ERROR', body.detail ?? fr.errors.generic, body.fields);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  } finally {
    clearTimeout(timer);
  }
}
