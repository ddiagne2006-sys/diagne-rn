// Jetons de design (skill viral-social-mobile-ui) : seule source des couleurs, rayons et espacements.
export const colors = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryTint: '#eff4ff',
  navHover: '#dbe5fb',
  surface: '#ffffff',
  sidebar: '#e8eefc',
  ink: '#111827',
  inkSoft: '#374151',
  muted: '#6b7280',
  line: '#e5e7eb',
  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef3c7',
  infoBg: '#dbeafe',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  onPrimary: '#ffffff',
  // Couleurs des réseaux, reprises du site (frontend/src/styles/index.css)
  tiktok: '#111827',
  facebook: '#1877f2',
  youtube: '#dc2626',
} as const;

export const gradients = {
  brand: ['#2563eb', '#a855f7'],
  page: ['#eaf0fc', '#f6f1fb'],
} as const;

export const radius = { field: 10, card: 14 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const touch = { min: 48 } as const;
export const fontSize = { title: 26, body: 15, small: 13 } as const;
