import { ApiError } from '@/api/client';
import { fr } from '@/i18n/fr';

export type FormErrors<Field extends string> = { general?: string; fields: Partial<Record<Field, string>> };

/** Traduit une erreur d'API `{detail, code, fields}` en message général et messages par champ. */
export function formErrorsFrom<Field extends string>(error: unknown, fieldNames: readonly Field[]): FormErrors<Field> {
  if (!(error instanceof ApiError)) return { general: fr.errors.generic, fields: {} };
  if (error.code === 'INVALID_CREDENTIALS') return { general: fr.auth.invalidCredentials, fields: {} };
  if (error.status === 429) return { general: fr.auth.tooManyAttempts, fields: {} };

  const fields: Partial<Record<Field, string>> = {};
  for (const name of fieldNames) {
    const message = error.fieldError(name);
    if (message) fields[name] = message;
  }
  // Erreur de validation entièrement rattachée aux champs : pas de message général en double
  const general = error.code === 'VALIDATION_ERROR' && Object.keys(fields).length > 0 ? undefined : error.message;
  return { general, fields };
}

/** Validation de confort : champs vides (le serveur valide tout le reste). */
export function emptyFieldErrors<Field extends string>(values: Record<Field, string>): FormErrors<Field> | null {
  const fields: Partial<Record<Field, string>> = {};
  for (const [name, value] of Object.entries(values) as [Field, string][]) {
    if (!value.trim()) fields[name] = fr.auth.required;
  }
  return Object.keys(fields).length > 0 ? { fields } : null;
}
