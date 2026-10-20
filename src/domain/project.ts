// Aides d'affichage uniquement : aucune règle de gestion ici (le serveur décide, le mobile affiche).
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faFacebook as fabFacebook, faTiktok as fabTiktok, faYoutube as fabYoutube } from '@fortawesome/free-brands-svg-icons';

import type { Network, ProjectStatus, SafetyAlert } from '@/api/types';
import { colors } from '@/theme/tokens';

export type Step = 1 | 2 | 3 | 4;

/** Étape atteinte selon le statut renvoyé par l'API, seule source de vérité. */
export function stepFromStatus(status: ProjectStatus): Step {
  switch (status) {
    case 'draft':
      return 1;
    case 'ideas_ready':
    case 'idea_chosen':
      return 2;
    case 'script_ready':
      return 3;
    case 'scenes_ready':
      return 4;
  }
}

export const networkIcon: Record<Network, IconDefinition> = {
  tiktok: fabTiktok,
  facebook: fabFacebook,
  youtube: fabYoutube,
};

export const networkColor: Record<Network, string> = {
  tiktok: colors.tiktok,
  facebook: colors.facebook,
  youtube: colors.youtube,
};

/** Score sur 100 renvoyé par l'API, affiché sur 10 (« 8,5 »). */
export function score10(viralScore: number) {
  return (viralScore / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/** Libellé connu, sinon la valeur brute rendue lisible (« micro_fiction » → « Micro fiction »). */
export function humanLabel(labels: Record<string, string>, value: string) {
  const known = labels[value];
  if (known) return known;
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isHttpUrl(url: string | null): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

/** Seules les alertes de sécurité de gravité « haute » sont montrées (comme sur le site). */
export function visibleSafetyAlerts(alerts: SafetyAlert[]) {
  return alerts.filter((alert) => alert.severity?.toLowerCase() === 'haute');
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
