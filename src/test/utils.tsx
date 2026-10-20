import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { AppConfig, Idea, Project, ProjectListItem } from '@/api/types';
import { AuthProvider } from '@/auth/AuthProvider';

export const API = 'http://192.168.1.20:8000/api';

export function json(status: number, body?: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

/**
 * Simule fetch route par route : clé « MÉTHODE /chemin/ » (sans /api ni ?query).
 * Une requête non prévue fait échouer le test. `calls` garde chaque URL appelée.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { method: string; url: URL; init: RequestInit }[] = [];
  const fetchMock = jest.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const method = (init.method ?? 'GET').toUpperCase();
    const key = `${method} ${url.pathname.replace(/^\/api/, '')}`;
    calls.push({ method, url, init });
    const handler = routes[key];
    if (!handler) throw new Error(`Requête non prévue : ${key}`);
    return handler(url, init);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { calls, fetchMock };
}

/** Sans nouvel essai, et sans minuteur de nettoyage du cache (sinon Jest attend 5 min avant de quitter). */
export function testQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
  });
}

export async function renderWithProviders(ui: ReactElement) {
  const client = testQueryClient();
  await render(
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
  return client;
}

export function testProject(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 'p1',
    title: 'Épargner 100 € par mois',
    theme: 'Finance personnelle',
    duration_seconds: 30,
    network: 'tiktok',
    ratio: '9:16',
    status: 'script_ready',
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-02T10:30:00Z',
    ...overrides,
  };
}

export function testIdea(position: number, overrides: Partial<Idea> = {}): Idea {
  return {
    id: `idea-${position}`,
    position,
    angle: `Angle ${position}`,
    title: `Idée ${position}`,
    hook: `Accroche ${position}`,
    viral_score: 80 + position,
    batch: 1,
    content_type: 'formation',
    platform_fit: '',
    key_facts: [],
    sources: [],
    verification_level: 'verifie',
    risks: [],
    criteria_scores: null,
    details: {},
    ...overrides,
  };
}

/** Projet complet cohérent avec son statut (idées présentes dès ideas_ready). */
export function testFullProject(status: Project['status'], overrides: Partial<Project> = {}): Project {
  const hasIdeas = status !== 'draft';
  const chosen = ['idea_chosen', 'script_ready', 'scenes_ready'].includes(status);
  return {
    ...testProject({ status }),
    chosen_idea_id: chosen ? 'idea-1' : null,
    ideas: hasIdeas ? [1, 2, 3, 4, 5].map((position) => testIdea(position)) : [],
    ideas_context: { interpreted_theme: null, alerts: [], safety_alerts: [] },
    segments: [],
    script_context: {} as Project['script_context'],
    scenes: [],
    scenes_context: {} as Project['scenes_context'],
    word_count: 0,
    reading_seconds: 0,
    too_long: false,
    scenes_stale: false,
    agents: { ideas: null, script: null, scenes: null },
    ...overrides,
  };
}

export const testConfig: AppConfig = {
  networks: [
    { value: 'tiktok', label: 'TikTok', ratio: '9:16' },
    { value: 'facebook', label: 'Facebook', ratio: '4:5' },
    { value: 'youtube', label: 'YouTube', ratio: '16:9' },
  ],
  durations: [15, 30, 60, 90],
  suggestions: ['Épargner sans se priver'],
  theme_min_length: 3,
  theme_max_length: 200,
  segment_max_length: 600,
};

export function page(results: ProjectListItem[], next: string | null = null, count = results.length) {
  return { count, next, previous: null, results };
}
