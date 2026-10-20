import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type { AppConfig, Project, ProjectCreate, ProjectPage } from './types';

/**
 * Routes d'agent : le serveur attend jusqu'à 180 s (AGENT_TIMEOUT_SECONDS) et peut faire un nouvel essai sur erreur
 * réseau. Le client attend donc 200 s avant d'abandonner (skill viral-social-mobile-api).
 */
export const AGENT_TIMEOUT_MS = 200_000;

/** GET /api/projects/ : projets du créateur, les plus récemment modifiés d'abord, 20 par page. */
export function useProjects(search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.projectList(search),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ page: String(pageParam) });
      if (search) params.set('search', search);
      return api<ProjectPage>(`/projects/?${params}`, { signal });
    },
    initialPageParam: 1,
    placeholderData: keepPreviousData, // la liste ne clignote pas pendant la recherche
    getNextPageParam: (lastPage, _pages, lastPageParam) => (lastPage.next ? lastPageParam + 1 : undefined),
  });
}

/** GET /api/projects/{id}/ : projet complet. */
export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: ({ signal }) => api<Project>(`/projects/${id}/`, { signal }),
  });
}

/** GET /api/config/ : réseaux et ratios (RG2), durées, bornes du sujet (RG1), suggestions. */
export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: ({ signal }) => api<AppConfig>('/config/', { signal }),
    staleTime: Infinity,
  });
}

/** Chaque écriture renvoie le projet complet : il remplace le cache, la liste et le tableau de bord sont rafraîchis. */
function storeProject(queryClient: QueryClient, project: Project) {
  queryClient.setQueryData(queryKeys.project(project.id), project);
  queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/** POST /api/projects/ : crée un brouillon (RG12). */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brief: ProjectCreate) => api<Project>('/projects/', { method: 'POST', json: brief }),
    onSuccess: (project) => storeProject(queryClient, project),
  });
}

/** POST /api/projects/{id}/ideas/ (agent 1). Sans `confirm`, le serveur répond 409 s'il faut effacer l'aval (RG11). */
export function useGenerateIdeas(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.agent(projectId, 'ideas'),
    mutationFn: (confirm: boolean) =>
      api<Project>(`/projects/${projectId}/ideas/`, { method: 'POST', json: { confirm }, timeoutMs: AGENT_TIMEOUT_MS }),
    onSuccess: (project) => storeProject(queryClient, project),
  });
}

/** POST /api/projects/{id}/ideas/{idea_id}/choose/ (RG4). 409 si un script serait effacé (RG11). */
export function useChooseIdea(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, confirm }: { ideaId: string; confirm: boolean }) =>
      api<Project>(`/projects/${projectId}/ideas/${ideaId}/choose/`, { method: 'POST', json: { confirm } }),
    onSuccess: (project) => storeProject(queryClient, project),
  });
}
