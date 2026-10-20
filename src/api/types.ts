// Alias sur les types générés depuis backend/openapi.yaml (npm run api:types). Jamais de forme écrite à la main.
import type { components } from './schema';

type Schemas = components['schemas'];

export type ApiErrorBody = Schemas['ApiError'];
export type User = Schemas['User'];
export type Token = Schemas['Token'];
export type LoginInput = Schemas['Login'];
export type RegisterInput = Schemas['Register'];
export type Network = Schemas['NetworkEnum'];
export type ProjectStatus = Schemas['ProjectStatusEnum'];
export type ProjectListItem = Schemas['ProjectListItem'];
export type ProjectPage = Schemas['PaginatedProjectList'];
export type Project = Schemas['Project'];
export type ProjectCreate = Schemas['ProjectCreate'];
export type AppConfig = Schemas['AppConfig'];
export type Duration = Schemas['DurationEnum'];
export type Idea = Schemas['Idea'];
export type IdeaSource = Schemas['IdeaSource'];
export type SafetyAlert = Schemas['SafetyAlert'];
export type AgentName = Schemas['AgentEnum'];
