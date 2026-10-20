import { fr } from '@/i18n/fr';

import { ApiError } from './client';

/** Message à montrer : le detail du serveur, ou un texte de fr.ts (jamais de détail technique). */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : fr.errors.generic;
}
