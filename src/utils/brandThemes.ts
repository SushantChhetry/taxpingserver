const BRAND_THEME_IDS = [
  'classic-blue',
  'forest-ledger',
  'warm-copper',
  'midnight-gold',
  'coastal-teal',
  'plum-advisory',
  'olive-stone',
  'rosewood',
] as const;

export type BrandThemeId = typeof BRAND_THEME_IDS[number];

const BRAND_THEME_PRIMARY_COLORS: Record<BrandThemeId, string> = {
  'classic-blue': '#2E5ED4',
  'forest-ledger': '#1F7A5C',
  'warm-copper': '#B86A2C',
  'midnight-gold': '#8A6A14',
  'coastal-teal': '#0F766E',
  'plum-advisory': '#7C3AED',
  'olive-stone': '#5F6B2F',
  rosewood: '#A23B4A',
};

export const DEFAULT_BRAND_THEME_ID: BrandThemeId = 'classic-blue';

export function isBrandThemeId(value: unknown): value is BrandThemeId {
  return typeof value === 'string' && BRAND_THEME_IDS.includes(value as BrandThemeId);
}

export function normalizeBrandThemeId(value: unknown): BrandThemeId | null {
  return isBrandThemeId(value) ? value : null;
}

export function getBrandThemePrimaryColor(themeId: BrandThemeId | null | undefined): string {
  return BRAND_THEME_PRIMARY_COLORS[themeId ?? DEFAULT_BRAND_THEME_ID];
}
