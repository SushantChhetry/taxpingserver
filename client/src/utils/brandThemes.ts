import type { CSSProperties } from 'react';

export type BrandThemeId =
  | 'classic-blue'
  | 'forest-ledger'
  | 'warm-copper'
  | 'midnight-gold'
  | 'coastal-teal'
  | 'plum-advisory'
  | 'olive-stone'
  | 'rosewood';

export interface BrandThemeDefinition {
  id: BrandThemeId;
  name: string;
  description: string;
  primary: string;
  dark: string;
  light: string;
}

export interface ResolvedBrandTheme extends BrandThemeDefinition {
  lightBorder: string;
  surface: string;
  ink: string;
  inkSoft: string;
  onBrand: string;
}

export const DEFAULT_BRAND_COLOR = '#2E5ED4';

export const BRAND_THEMES: BrandThemeDefinition[] = [
  {
    id: 'classic-blue',
    name: 'Professional',
    description: 'Clean and dependable for a broad client base.',
    primary: '#2E5ED4',
    dark: '#21449C',
    light: '#EEF2FF',
  },
  {
    id: 'forest-ledger',
    name: 'Local Trust',
    description: 'Grounded green for neighborhood firms and referrals.',
    primary: '#1F7A5C',
    dark: '#145343',
    light: '#E8F6F0',
  },
  {
    id: 'warm-copper',
    name: 'Boutique',
    description: 'Warm copper for relationship-driven practices.',
    primary: '#B86A2C',
    dark: '#8A4D1E',
    light: '#FCEFE4',
  },
  {
    id: 'midnight-gold',
    name: 'Executive',
    description: 'Dark gold accents for premium advisory positioning.',
    primary: '#8A6A14',
    dark: '#624A0D',
    light: '#F7F0D9',
  },
  {
    id: 'coastal-teal',
    name: 'Modern Calm',
    description: 'Teal for a clean, steady, modern tone.',
    primary: '#0F766E',
    dark: '#115E59',
    light: '#E6F6F4',
  },
  {
    id: 'plum-advisory',
    name: 'Distinctive',
    description: 'Plum accents for firms that want more personality.',
    primary: '#7C3AED',
    dark: '#5B21B6',
    light: '#F3E8FF',
  },
  {
    id: 'olive-stone',
    name: 'Family Office',
    description: 'Muted olive for high-touch, understated branding.',
    primary: '#5F6B2F',
    dark: '#48501F',
    light: '#F1F4E3',
  },
  {
    id: 'rosewood',
    name: 'Warm Premium',
    description: 'Rosewood tones for personal service with polish.',
    primary: '#A23B4A',
    dark: '#7F2E3A',
    light: '#F9E8EB',
  },
];

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isBrandThemeId(value: unknown): value is BrandThemeId {
  return BRAND_THEMES.some((theme) => theme.id === value);
}

export function normalizeHexColor(color: string | null | undefined): string | null {
  return /^#[0-9A-Fa-f]{6}$/.test(color ?? '') ? String(color).toUpperCase() : null;
}

export function getBrandThemeById(themeId: string | null | undefined): BrandThemeDefinition | null {
  return BRAND_THEMES.find((theme) => theme.id === themeId) ?? null;
}

export function resolveBrandTheme({
  themeId,
  color,
}: {
  themeId?: string | null;
  color?: string | null;
} = {}): ResolvedBrandTheme {
  const selectedTheme = getBrandThemeById(themeId);
  if (selectedTheme) {
    return {
      ...selectedTheme,
      lightBorder: withAlpha(selectedTheme.primary, 0.26),
      surface: withAlpha(selectedTheme.primary, 0.08),
      ink: selectedTheme.dark,
      inkSoft: withAlpha(selectedTheme.dark, 0.74),
      onBrand: '#FFFFFF',
    };
  }

  const primary = normalizeHexColor(color) ?? DEFAULT_BRAND_COLOR;
  return {
    id: 'classic-blue',
    name: 'Custom',
    description: 'Custom brand color.',
    primary,
    dark: primary,
    light: withAlpha(primary, 0.12),
    lightBorder: withAlpha(primary, 0.28),
    surface: withAlpha(primary, 0.08),
    ink: primary,
    inkSoft: withAlpha(primary, 0.82),
    onBrand: '#FFFFFF',
  };
}

export function getBrandThemeStyle(theme: ResolvedBrandTheme): CSSProperties {
  return {
    ['--brand-primary' as const]: theme.primary,
    ['--brand-primary-dark' as const]: theme.dark,
    ['--brand-primary-light' as const]: theme.light,
    ['--brand-primary-border' as const]: theme.lightBorder,
    ['--brand-primary-surface' as const]: theme.surface,
    ['--brand-primary-ink' as const]: theme.ink,
    ['--brand-primary-ink-soft' as const]: theme.inkSoft,
    ['--brand-on-primary' as const]: theme.onBrand,
  } as CSSProperties;
}
