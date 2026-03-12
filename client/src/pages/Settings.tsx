import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  Building2,
  Clock3,
  ExternalLink,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Mail,
  Palette,
  Phone,
  QrCode,
  Quote,
  Save,
} from 'lucide-react';
import logo from '../../../src/assets/logo.png';
import { getPreparerSettings, updatePreparerSettings } from '../api';
import type { PreparerSettingsData } from '../types';
import Sidebar from '../components/Sidebar';
import { ToastContainer, toast } from '../components/Toast';
import { persistDashboardTheme } from '../components/DashboardThemeProvider';
import {
  BRAND_THEMES,
  getBrandThemeById,
  getBrandThemeStyle,
  normalizeHexColor,
  resolveBrandTheme,
} from '../utils/brandThemes';

const FOLLOWUP_OPTIONS = [24, 48, 72, 96];

function getPreviewColor(color: string): string {
  return normalizeHexColor(color) ?? '#3B6FE8';
}

function DetailCard({
  icon,
  label,
  value,
  tone = 'default',
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
  detail?: string;
}) {
  const toneColor =
    tone === 'success' ? '#16A34A' : tone === 'warning' ? '#C2410C' : '#1A1A1A';
  const toneBg =
    tone === 'success' ? '#F0FDF4' : tone === 'warning' ? '#FFF7ED' : '#F7F8FC';

  return (
    <div style={{
      border: '1px solid #E2E6F0',
      borderRadius: 12,
      background: 'white',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: toneBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: toneColor,
          }}>
            {icon}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9CA3AF' }}>
            {label}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{value}</div>
      {detail && <div style={{ fontSize: 12, lineHeight: 1.5, color: '#6B7280' }}>{detail}</div>}
    </div>
  );
}

export default function Settings() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<PreparerSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    brandThemeId: '',
    brandColor: '',
    brandTagline: '',
    brandLogoUrl: '',
    websiteUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    autoFollowupEnabled: true,
    autoFollowupHours: 48,
  });

  useEffect(() => {
    if (!preparerId) return;

    setLoading(true);
    getPreparerSettings(preparerId)
      .then((response) => {
        setData(response);
        setForm({
          businessName: response.preparer.businessName,
          brandThemeId: response.preparer.branding.themeId ?? '',
          brandColor: response.preparer.branding.color ?? '',
          brandTagline: response.preparer.branding.tagline ?? '',
          brandLogoUrl: response.preparer.branding.logoUrl ?? '',
          websiteUrl: response.preparer.branding.websiteUrl ?? '',
          instagramUrl: response.preparer.branding.instagramUrl ?? '',
          linkedinUrl: response.preparer.branding.linkedinUrl ?? '',
          autoFollowupEnabled: response.preparer.autoFollowupEnabled,
          autoFollowupHours: response.preparer.autoFollowupHours,
        });
        setError(null);
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [preparerId]);

  const preparer = data?.preparer ?? {
    id: preparerId ?? '',
    name: '',
    email: '',
    businessName: '',
    autoFollowupEnabled: true,
    autoFollowupHours: 48,
    twilioNumber: null,
    driveConnected: false,
      branding: {
        themeId: null,
        color: null,
      tagline: null,
      logoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      linkedinUrl: null,
    },
  };

  const trimmedBusinessName = form.businessName.trim();
  const trimmedBrandThemeId = form.brandThemeId.trim();
  const trimmedBrandColor = form.brandColor.trim();
  const trimmedBrandTagline = form.brandTagline.trim();
  const trimmedBrandLogoUrl = form.brandLogoUrl.trim();
  const trimmedWebsiteUrl = form.websiteUrl.trim();
  const trimmedInstagramUrl = form.instagramUrl.trim();
  const trimmedLinkedinUrl = form.linkedinUrl.trim();
  const selectedTheme = getBrandThemeById(trimmedBrandThemeId);
  const effectiveBrandColor = selectedTheme?.primary ?? trimmedBrandColor;
  const hasChanges = Boolean(
    data &&
    (
      trimmedBusinessName !== data.preparer.businessName ||
      trimmedBrandThemeId !== (data.preparer.branding.themeId ?? '') ||
      trimmedBrandColor !== (data.preparer.branding.color ?? '') ||
      trimmedBrandTagline !== (data.preparer.branding.tagline ?? '') ||
      trimmedBrandLogoUrl !== (data.preparer.branding.logoUrl ?? '') ||
      trimmedWebsiteUrl !== (data.preparer.branding.websiteUrl ?? '') ||
      trimmedInstagramUrl !== (data.preparer.branding.instagramUrl ?? '') ||
      trimmedLinkedinUrl !== (data.preparer.branding.linkedinUrl ?? '') ||
      form.autoFollowupEnabled !== data.preparer.autoFollowupEnabled ||
      form.autoFollowupHours !== data.preparer.autoFollowupHours
    )
  );

  const previewTheme = resolveBrandTheme({
    themeId: trimmedBrandThemeId || null,
    color: effectiveBrandColor,
  });
  const previewColor = getPreviewColor(effectiveBrandColor);
  const previewTagline = trimmedBrandTagline || 'Modern, simple document collection for busy clients.';
  const previewLogoUrl = trimmedBrandLogoUrl || logo;
  const previewLinks = [
    { label: 'Website', value: trimmedWebsiteUrl, icon: <Globe size={14} /> },
    { label: 'Instagram', value: trimmedInstagramUrl, icon: <Instagram size={14} /> },
    { label: 'LinkedIn', value: trimmedLinkedinUrl, icon: <Linkedin size={14} /> },
  ].filter((item) => item.value);

  function resetToDefaultTheme() {
    const defaultTheme = getBrandThemeById('classic-blue');
    setForm((prev) => ({
      ...prev,
      brandThemeId: 'classic-blue',
      brandColor: defaultTheme?.primary ?? '#2E5ED4',
    }));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preparerId || !trimmedBusinessName || saving) return;

    setSaving(true);
    try {
      const updated = await updatePreparerSettings(preparerId, {
        businessName: trimmedBusinessName,
        brandThemeId: trimmedBrandThemeId,
        brandColor: selectedTheme?.primary ?? trimmedBrandColor,
        brandTagline: trimmedBrandTagline,
        brandLogoUrl: trimmedBrandLogoUrl,
        websiteUrl: trimmedWebsiteUrl,
        instagramUrl: trimmedInstagramUrl,
        linkedinUrl: trimmedLinkedinUrl,
        autoFollowupEnabled: form.autoFollowupEnabled,
        autoFollowupHours: form.autoFollowupHours,
      });
      setData(updated);
      setForm({
        businessName: updated.preparer.businessName,
        brandThemeId: updated.preparer.branding.themeId ?? '',
        brandColor: updated.preparer.branding.color ?? '',
        brandTagline: updated.preparer.branding.tagline ?? '',
        brandLogoUrl: updated.preparer.branding.logoUrl ?? '',
        websiteUrl: updated.preparer.branding.websiteUrl ?? '',
        instagramUrl: updated.preparer.branding.instagramUrl ?? '',
        linkedinUrl: updated.preparer.branding.linkedinUrl ?? '',
        autoFollowupEnabled: updated.preparer.autoFollowupEnabled,
        autoFollowupHours: updated.preparer.autoFollowupHours,
      });
      persistDashboardTheme(preparerId, updated.preparer.branding);
      toast('Settings saved', 'success');
      setError(null);
    } catch {
      toast('Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error && !data && !loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: '#EF4444', fontSize: 14 }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: 'var(--brand-primary, #3B6FE8)', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...getBrandThemeStyle(previewTheme), display: 'flex', minHeight: '100vh', background: '#F7F8FC' }}>
      <Sidebar
        preparerId={preparerId ?? ''}
        preparerName={preparer.name}
        preparerEmail={preparer.email}
        businessName={preparer.businessName}
        activeNav="Settings"
      />

      <div style={{ flex: 1, marginLeft: 240, padding: 20 }}>
        <div style={{
          background: 'white',
          border: '1px solid #E2E6F0',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '24px 28px',
            borderBottom: '1px solid #E2E6F0',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <Link
                to={`/dashboard/${preparerId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#6B7280',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 12,
                }}
              >
                <ArrowLeft size={14} /> Back to clients
              </Link>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
                Settings
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
                Manage how TaxPing presents your firm and handles client follow-ups.
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: '#F7F8FC',
              border: '1px solid var(--brand-primary-light, #EEF2FF)',
              minWidth: 220,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                Client-facing preview
              </div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginTop: 8, lineHeight: 1.5 }}>
                {trimmedBusinessName || 'Your business'} sends reminders after{' '}
                {form.autoFollowupHours} hours of inactivity.
              </div>
            </div>
          </div>

          <div style={{ padding: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{
                border: '1px solid #E2E6F0',
                borderRadius: 12,
                padding: 22,
                background: '#FCFCFD',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <Building2 size={18} color="var(--brand-primary, #3B6FE8)" />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Workspace identity</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                      This name is shown in TaxPing and used in client-facing messages.
                    </div>
                  </div>
                </div>

                <label style={{ display: 'block' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                    Business name
                  </div>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
                    placeholder="North Star Tax"
                    style={{
                      width: '100%',
                      border: '1px solid #D7DCE8',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 15,
                      color: '#1A1A1A',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
              </div>

              <div style={{
                border: '1px solid #E2E6F0',
                borderRadius: 12,
                padding: 22,
                background: '#FCFCFD',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Palette size={18} color="var(--brand-primary, #3B6FE8)" />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Brand kit</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                        These fields shape your public QR and signup pages. Leave any field blank to use the TaxPing placeholder treatment.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetToDefaultTheme}
                    title="Revert to default TaxPing theme"
                    aria-label="Revert to default TaxPing theme"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid #D7DCE8',
                      background: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={logo}
                      alt="TaxPing default theme"
                      style={{ width: 18, height: 18, objectFit: 'contain' }}
                    />
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      Theme palette
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      {BRAND_THEMES.map((theme) => {
                        const selected = form.brandThemeId === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, brandThemeId: theme.id, brandColor: theme.primary }))}
                            style={{
                              border: `1px solid ${selected ? theme.primary : '#D7DCE8'}`,
                              borderRadius: 14,
                              padding: 12,
                              background: selected ? theme.light : 'white',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                            }}
                          >
                            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                              <span style={{ width: 22, height: 22, borderRadius: 999, background: theme.primary, display: 'block' }} />
                              <span style={{ width: 22, height: 22, borderRadius: 999, background: theme.dark, display: 'block' }} />
                              <span style={{ width: 22, height: 22, borderRadius: 999, background: theme.light, border: '1px solid rgba(148,163,184,0.28)', display: 'block' }} />
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{theme.name}</div>
                            <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: '#6B7280' }}>{theme.description}</div>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, brandThemeId: '' }))}
                        style={{
                          border: `1px solid ${form.brandThemeId === '' ? 'var(--brand-primary, #3B6FE8)' : '#D7DCE8'}`,
                          borderRadius: 14,
                          padding: 12,
                          background: form.brandThemeId === '' ? 'var(--brand-primary-light, #EEF2FF)' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ width: 72, height: 22, borderRadius: 999, marginBottom: 10, background: 'linear-gradient(90deg, #E2E8F0 0%, var(--brand-primary, #3B6FE8) 100%)' }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Custom color</div>
                        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: '#6B7280' }}>
                          Use a custom hex value if none of the presets fit the business.
                        </div>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      Custom brand color
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Palette size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        value={form.brandColor}
                        onChange={(e) => setForm((prev) => ({ ...prev, brandColor: e.target.value }))}
                        placeholder="#2E5ED4"
                        disabled={Boolean(selectedTheme)}
                        style={{
                          width: '100%',
                          border: '1px solid #D7DCE8',
                          borderRadius: 10,
                          padding: '12px 14px 12px 38px',
                          fontSize: 15,
                          color: '#1A1A1A',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: selectedTheme ? '#F8FAFC' : 'white',
                          cursor: selectedTheme ? 'not-allowed' : 'text',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: '#9CA3AF' }}>
                      {selectedTheme
                        ? `${selectedTheme.name} sets the accent color automatically. Switch to Custom color to enter a hex code.`
                        : 'Use a hex value like #2E5ED4 for a fully custom accent.'}
                    </div>
                  </label>

                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      Logo URL
                    </div>
                    <div style={{ position: 'relative' }}>
                      <ImageIcon size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="url"
                        value={form.brandLogoUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, brandLogoUrl: e.target.value }))}
                        placeholder="https://..."
                        style={{
                          width: '100%',
                          border: '1px solid #D7DCE8',
                          borderRadius: 10,
                          padding: '12px 14px 12px 38px',
                          fontSize: 15,
                          color: '#1A1A1A',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </label>
                </div>
                </div>

                <label style={{ display: 'block', marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                    Brand tagline
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Quote size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 14 }} />
                    <input
                      type="text"
                      value={form.brandTagline}
                      onChange={(e) => setForm((prev) => ({ ...prev, brandTagline: e.target.value }))}
                      placeholder="Fast, calm filing for busy clients"
                      style={{
                        width: '100%',
                        border: '1px solid #D7DCE8',
                        borderRadius: 10,
                        padding: '12px 14px 12px 38px',
                        fontSize: 15,
                        color: '#1A1A1A',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      Website
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Globe size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="url"
                        value={form.websiteUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                        placeholder="https://yourfirm.com"
                        style={{
                          width: '100%',
                          border: '1px solid #D7DCE8',
                          borderRadius: 10,
                          padding: '12px 14px 12px 38px',
                          fontSize: 15,
                          color: '#1A1A1A',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </label>

                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      Instagram
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Instagram size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="url"
                        value={form.instagramUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                        placeholder="https://instagram.com/yourfirm"
                        style={{
                          width: '100%',
                          border: '1px solid #D7DCE8',
                          borderRadius: 10,
                          padding: '12px 14px 12px 38px',
                          fontSize: 15,
                          color: '#1A1A1A',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </label>

                  <label style={{ display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      LinkedIn
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Linkedin size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="url"
                        value={form.linkedinUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                        placeholder="https://linkedin.com/company/yourfirm"
                        style={{
                          width: '100%',
                          border: '1px solid #D7DCE8',
                          borderRadius: 10,
                          padding: '12px 14px 12px 38px',
                          fontSize: 15,
                          color: '#1A1A1A',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div style={{
                border: '1px solid #E2E6F0',
                borderRadius: 12,
                padding: 22,
                background: '#FCFCFD',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <BellRing size={18} color="var(--brand-primary, #3B6FE8)" />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Automation</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                      Control when TaxPing nudges clients who have gone quiet.
                    </div>
                  </div>
                </div>

                <div style={{
                  border: '1px solid #E2E6F0',
                  borderRadius: 12,
                  background: 'white',
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Automatic follow-ups</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      TaxPing will send a reminder if a client stops responding.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, autoFollowupEnabled: !prev.autoFollowupEnabled }))}
                    style={{
                      width: 54,
                      height: 30,
                      borderRadius: 9999,
                      border: 'none',
                      background: form.autoFollowupEnabled ? 'var(--brand-primary, #3B6FE8)' : '#D1D5DB',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: form.autoFollowupEnabled ? 'flex-end' : 'flex-start',
                      transition: 'background 150ms',
                    }}
                    aria-label="Toggle automatic follow-ups"
                  >
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'white',
                      display: 'block',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                    }} />
                  </button>
                </div>

                <label style={{ display: 'block', marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                    Reminder delay
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Clock3 size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <select
                      value={form.autoFollowupHours}
                      disabled={!form.autoFollowupEnabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, autoFollowupHours: parseInt(e.target.value, 10) }))}
                      style={{
                        width: '100%',
                        border: '1px solid #D7DCE8',
                        borderRadius: 10,
                        padding: '12px 14px 12px 38px',
                        fontSize: 15,
                        color: form.autoFollowupEnabled ? '#1A1A1A' : '#9CA3AF',
                        background: form.autoFollowupEnabled ? 'white' : '#F7F8FC',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        appearance: 'none',
                      }}
                    >
                      {FOLLOWUP_OPTIONS.map((hours) => (
                        <option key={hours} value={hours}>
                          After {hours} hours
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={!hasChanges || !trimmedBusinessName || saving || loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: !hasChanges || !trimmedBusinessName || saving || loading ? '#BFDBFE' : 'var(--brand-primary, #3B6FE8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !hasChanges || !trimmedBusinessName || saving || loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <DetailCard
                icon={<Mail size={16} />}
                label="Account email"
                value={loading ? 'Loading…' : preparer.email || 'Not available'}
                detail="Used for account access and future operational notifications."
              />
              <DetailCard
                icon={<Phone size={16} />}
                label="Client texting line"
                value={loading ? 'Loading…' : preparer.twilioNumber || 'Not connected'}
                tone={preparer.twilioNumber ? 'success' : 'warning'}
                detail="This is the number clients text when sending documents to TaxPing."
              />
              <DetailCard
                icon={<HardDrive size={16} />}
                label="Google Drive"
                value={loading ? 'Loading…' : preparer.driveConnected ? 'Connected' : 'Needs setup'}
                tone={preparer.driveConnected ? 'success' : 'warning'}
                detail="Incoming client documents are saved to your Drive workspace when this connection is active."
              />
              <div style={{
                border: '1px solid #E2E6F0',
                borderRadius: 12,
                background: 'white',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'var(--brand-primary-light, #EEF2FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-primary, #3B6FE8)',
                  }}>
                    <Palette size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                      Brand preview
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginTop: 4 }}>
                      Public page treatment
                    </div>
                  </div>
                </div>
                <div style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  background: '#0F172A',
                  color: 'white',
                }}>
                  <div style={{
                    padding: 18,
                    background: `linear-gradient(135deg, ${previewColor} 0%, #0F172A 72%)`,
                  }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: 'rgba(255,255,255,0.92)',
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={previewLogoUrl}
                        alt={`${trimmedBusinessName || 'TaxPing'} logo`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ marginTop: 14, fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>
                      {trimmedBusinessName || 'Your business'}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
                      {previewTagline}
                    </div>
                  </div>
                  <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                    <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
                      This is the styling your public signup and QR pages will inherit.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {previewLinks.length > 0 ? previewLinks.map((item) => (
                        <span
                          key={item.label}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 10px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.08)',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {item.icon} {item.label}
                        </span>
                      )) : (
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>
                          Add website or social links to show branded footer chips here.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{
                border: '1px solid #E2E6F0',
                borderRadius: 12,
                background: 'white',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'var(--brand-primary-light, #EEF2FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-primary, #3B6FE8)',
                  }}>
                    <QrCode size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                      Public intake
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginTop: 4 }}>
                      QR and signup pages
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#6B7280' }}>
                  Share a clean QR poster or link clients to a lightweight signup form that texts them the first step automatically.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link
                    to={`/public/${preparerId}/qr`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: '#1A1A1A',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <QrCode size={14} /> Open QR page
                  </Link>
                  <Link
                    to={`/public/${preparerId}/signup`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'var(--brand-primary-light, #EEF2FF)',
                      color: 'var(--brand-primary, #2E5ED4)',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <ExternalLink size={14} /> Open signup form
                  </Link>
                  <Link
                    to="/public/demo/qr"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: '#F8FAFC',
                      color: '#475569',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <QrCode size={14} /> Open demo QR
                  </Link>
                  <Link
                    to="/public/demo/signup"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: '#F8FAFC',
                      color: '#475569',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <ExternalLink size={14} /> Open demo signup
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
