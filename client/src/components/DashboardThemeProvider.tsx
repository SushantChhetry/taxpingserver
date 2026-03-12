import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getPreparerSettings } from '../api';
import { getBrandThemeStyle, resolveBrandTheme, type ResolvedBrandTheme } from '../utils/brandThemes';

const STORAGE_KEY_PREFIX = 'taxping:brand-theme:';
const THEME_EVENT = 'taxping:theme-updated';

function getDashboardPreparerId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  return match?.[1] ?? null;
}

function readStoredTheme(preparerId: string): ResolvedBrandTheme | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${preparerId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { themeId?: string | null; color?: string | null };
    return resolveBrandTheme(parsed);
  } catch {
    return null;
  }
}

export function persistDashboardTheme(preparerId: string, branding: { themeId?: string | null; color?: string | null }) {
  const payload = JSON.stringify({
    themeId: branding.themeId ?? null,
    color: branding.color ?? null,
  });
  window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${preparerId}`, payload);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { preparerId, ...branding } }));
}

export default function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const preparerId = useMemo(() => getDashboardPreparerId(location.pathname), [location.pathname]);
  const [theme, setTheme] = useState<ResolvedBrandTheme>(() => resolveBrandTheme());

  useEffect(() => {
    if (!preparerId) {
      setTheme(resolveBrandTheme());
      return;
    }

    const storedTheme = readStoredTheme(preparerId);
    if (storedTheme) setTheme(storedTheme);

    let cancelled = false;
    getPreparerSettings(preparerId)
      .then((response) => {
        if (cancelled) return;
        const nextTheme = resolveBrandTheme(response.preparer.branding);
        setTheme(nextTheme);
        persistDashboardTheme(preparerId, response.preparer.branding);
      })
      .catch(() => {
        if (!storedTheme && !cancelled) setTheme(resolveBrandTheme());
      });

    return () => {
      cancelled = true;
    };
  }, [preparerId]);

  useEffect(() => {
    function handleThemeUpdate(event: Event) {
      if (!preparerId) return;
      const customEvent = event as CustomEvent<{ preparerId?: string; themeId?: string | null; color?: string | null }>;
      if (customEvent.detail?.preparerId !== preparerId) return;
      setTheme(resolveBrandTheme(customEvent.detail));
    }

    window.addEventListener(THEME_EVENT, handleThemeUpdate as EventListener);
    return () => window.removeEventListener(THEME_EVENT, handleThemeUpdate as EventListener);
  }, [preparerId]);

  return <div style={getBrandThemeStyle(theme)}>{children}</div>;
}
