export const queryKeys = {
  projects: ['projects'] as const,
  projectList: (search: string) => ['projects', { search }] as const,
  project: (id: string) => ['project', id] as const,
  dashboard: ['dashboard'] as const,
  config: ['config'] as const,
  agent: (projectId: string, agent: string) => ['agent', projectId, agent] as const,
};
