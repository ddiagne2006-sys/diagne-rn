import { api } from './client';
import type { LoginInput, RegisterInput, Token, User } from './types';

// Routes du contrat (backend/openapi.yaml), tranche M0.
export const fetchMe = () => api<User>('/auth/me/');
export const requestToken = (input: LoginInput) => api<Token>('/auth/token/', { method: 'POST', json: input });
export const registerWithToken = (input: RegisterInput) =>
  api<Token>('/auth/token/register/', { method: 'POST', json: input });
export const revokeToken = () => api<void>('/auth/token/logout/', { method: 'POST' });
