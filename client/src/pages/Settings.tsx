import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SiGoogledrive, SiInstagram } from '@icons-pack/react-simple-icons';
import {
  ArrowLeft,
  BellRing,
  Building2,
  Clock3,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Linkedin,
  Mail,
  MessageSquare,
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
const AI_TONE_OPTIONS = [
  {
    id: 'friendly' as const,
    label: 'Friendly',
    detail: 'Warm and welcoming for most firms.',
  },
  {
    id: 'calm' as const,
    label: 'Calm',
    detail: 'A little softer for clients who need reassurance.',
  },
  {
    id: 'direct' as const,
    label: 'Direct',
    detail: 'Short and clear with less small talk.',
  },
];

function getPreviewColor(color: string): string {
  return normalizeHexColor(color) ?? '#3B6FE8';
}

function buildAssistantPreview(
  tone: 'friendly' | 'calm' | 'direct',
  businessName: string,
  clientNotes: string,
  collectDocuments: boolean,
  collectTaxSituation: boolean,
  customQuestions: string[],
  reviewRequestEnabled: boolean
): string {
  const firm = businessName || 'Your business';
  const note = clientNotes.trim();
  const focus = [
    collectDocuments ? 'tax documents' : null,
    collectTaxSituation ? 'a few tax situation details' : null,
  ].filter(Boolean).join(' and ');
  const questionHint = customQuestions[0] ? ` First question: ${customQuestions[0]}` : '';
  const closingHint = reviewRequestEnabled ? ' When the file is finished, I can also send a quick review ask.' : '';

  if (tone === 'calm') {
    return note
      ? `Hi! I’m here to help ${firm} gather ${focus || 'what is needed'}. ${note}${questionHint}${closingHint}`
      : `Hi! I’m here to help ${firm} gather ${focus || 'what is needed'}. Send a photo whenever you’re ready.${questionHint}${closingHint}`;
  }

  if (tone === 'direct') {
    return note
      ? `${firm} here. Please send ${focus || 'what is needed'} when ready. ${note}${questionHint}${closingHint}`
      : `${firm} here. Please send ${focus || 'what is needed'} when ready.${questionHint}${closingHint}`;
  }

  return note
    ? `Hi! I’m helping ${firm} gather ${focus || 'what is needed'}. ${note}${questionHint}${closingHint}`
    : `Hi! I’m helping ${firm} gather ${focus || 'what is needed'}. You can send a photo here anytime.${questionHint}${closingHint}`;
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
  const [activeTab, setActiveTab] = useState<'business' | 'ai'>('business');
  const [form, setForm] = useState({
    businessName: '',
    brandThemeId: '',
    brandColor: '',
    brandTagline: '',
    brandLogoUrl: '',
    websiteUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    aiTone: 'friendly' as 'friendly' | 'calm' | 'direct',
    aiClientNotes: '',
    aiCollectDocuments: true,
    aiCollectTaxSituation: false,
    aiCustomQuestionsText: '',
    aiReviewRequestEnabled: false,
    aiReviewRequestMessage: '',
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
          aiTone: response.preparer.aiAssistant.tone,
          aiClientNotes: response.preparer.aiAssistant.clientNotes ?? '',
          aiCollectDocuments: response.preparer.aiAssistant.collectDocuments,
          aiCollectTaxSituation: response.preparer.aiAssistant.collectTaxSituation,
          aiCustomQuestionsText: response.preparer.aiAssistant.customQuestions.join('\n'),
          aiReviewRequestEnabled: response.preparer.aiAssistant.reviewRequestEnabled,
          aiReviewRequestMessage: response.preparer.aiAssistant.reviewRequestMessage ?? '',
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
    aiAssistant: {
      tone: 'friendly' as const,
      clientNotes: null,
      collectDocuments: true,
      collectTaxSituation: false,
      customQuestions: [],
      reviewRequestEnabled: false,
      reviewRequestMessage: null,
    },
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
  const trimmedAiClientNotes = form.aiClientNotes.trim();
  const trimmedAiReviewRequestMessage = form.aiReviewRequestMessage.trim();
  const aiCustomQuestions = form.aiCustomQuestionsText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
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
      form.aiTone !== data.preparer.aiAssistant.tone ||
      trimmedAiClientNotes !== (data.preparer.aiAssistant.clientNotes ?? '') ||
      form.aiCollectDocuments !== data.preparer.aiAssistant.collectDocuments ||
      form.aiCollectTaxSituation !== data.preparer.aiAssistant.collectTaxSituation ||
      aiCustomQuestions.join('\n') !== data.preparer.aiAssistant.customQuestions.join('\n') ||
      form.aiReviewRequestEnabled !== data.preparer.aiAssistant.reviewRequestEnabled ||
      trimmedAiReviewRequestMessage !== (data.preparer.aiAssistant.reviewRequestMessage ?? '') ||
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
    { label: 'Instagram', value: trimmedInstagramUrl, icon: <SiInstagram size={14} color="default" /> },
    { label: 'LinkedIn', value: trimmedLinkedinUrl, icon: <Linkedin size={14} /> },
  ].filter((item) => item.value);
  const assistantPreview = buildAssistantPreview(
    form.aiTone,
    trimmedBusinessName,
    trimmedAiClientNotes,
    form.aiCollectDocuments,
    form.aiCollectTaxSituation,
    aiCustomQuestions,
    form.aiReviewRequestEnabled
  );
  const selectedAiTone = AI_TONE_OPTIONS.find((option) => option.id === form.aiTone);

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
        aiTone: form.aiTone,
        aiClientNotes: trimmedAiClientNotes,
        aiCollectDocuments: form.aiCollectDocuments,
        aiCollectTaxSituation: form.aiCollectTaxSituation,
        aiCustomQuestions,
        aiReviewRequestEnabled: form.aiReviewRequestEnabled,
        aiReviewRequestMessage: trimmedAiReviewRequestMessage,
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
        aiTone: updated.preparer.aiAssistant.tone,
        aiClientNotes: updated.preparer.aiAssistant.clientNotes ?? '',
        aiCollectDocuments: updated.preparer.aiAssistant.collectDocuments,
        aiCollectTaxSituation: updated.preparer.aiAssistant.collectTaxSituation,
        aiCustomQuestionsText: updated.preparer.aiAssistant.customQuestions.join('\n'),
        aiReviewRequestEnabled: updated.preparer.aiAssistant.reviewRequestEnabled,
        aiReviewRequestMessage: updated.preparer.aiAssistant.reviewRequestMessage ?? '',
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

      <div className="app-page app-page-tight">
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
                Keep business details separate from AI behavior so setup stays simple.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                {[
                  { id: 'business' as const, label: 'Business information' },
                  { id: 'ai' as const, label: 'AI setup' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      border: `1px solid ${activeTab === tab.id ? 'var(--brand-primary, #3B6FE8)' : '#D7DCE8'}`,
                      borderRadius: 999,
                      padding: '10px 14px',
                      background: activeTab === tab.id ? 'var(--brand-primary-light, #EEF2FF)' : 'white',
                      color: activeTab === tab.id ? 'var(--brand-primary-dark, #21449C)' : '#475569',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
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
                {form.autoFollowupHours} hours of inactivity with a {selectedAiTone?.label.toLowerCase() ?? 'friendly'} assistant voice.
              </div>
            </div>
          </div>

          <div style={{ padding: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {activeTab === 'business' && (
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
              )}

              {activeTab === 'business' && (
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
                      <SiInstagram size={15} color="#E4405F" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
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
              )}

              {activeTab === 'ai' && (
              <div style={{
                border: '1px solid #E2E6F0',
                borderRadius: 12,
                padding: 22,
                background: '#FCFCFD',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <MessageSquare size={18} color="var(--brand-primary, #3B6FE8)" />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>AI assistant</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                      Decide how the assistant talks, what it should collect, and what it should ask automatically.
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                    How should it sound?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {AI_TONE_OPTIONS.map((option) => {
                      const selected = form.aiTone === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, aiTone: option.id }))}
                          style={{
                            border: `1px solid ${selected ? 'var(--brand-primary, #3B6FE8)' : '#D7DCE8'}`,
                            borderRadius: 12,
                            padding: 14,
                            background: selected ? 'var(--brand-primary-light, #EEF2FF)' : 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{option.label}</div>
                          <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: '#6B7280' }}>{option.detail}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label style={{ display: 'block', marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                    One note for every client message
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Quote size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 14 }} />
                    <textarea
                      value={form.aiClientNotes}
                      onChange={(e) => setForm((prev) => ({ ...prev, aiClientNotes: e.target.value.slice(0, 280) }))}
                      placeholder="Example: Let clients know we usually review uploads the same day."
                      rows={4}
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
                        resize: 'vertical',
                        minHeight: 108,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: '#9CA3AF' }}>
                      This helps the assistant stay on-brand without adding extra setup.
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>
                      {form.aiClientNotes.length}/280
                    </div>
                  </div>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
                  <div style={{ border: '1px solid #E2E6F0', borderRadius: 12, background: 'white', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Try to collect documents</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                          Keep asking for uploads like W-2s and 1099s.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, aiCollectDocuments: !prev.aiCollectDocuments }))}
                        style={{
                          width: 54,
                          height: 30,
                          borderRadius: 9999,
                          border: 'none',
                          background: form.aiCollectDocuments ? 'var(--brand-primary, #3B6FE8)' : '#D1D5DB',
                          padding: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: form.aiCollectDocuments ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', display: 'block' }} />
                      </button>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #E2E6F0', borderRadius: 12, background: 'white', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Ask about tax situation</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                          Let it ask simple fact-finding questions when helpful.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, aiCollectTaxSituation: !prev.aiCollectTaxSituation }))}
                        style={{
                          width: 54,
                          height: 30,
                          borderRadius: 9999,
                          border: 'none',
                          background: form.aiCollectTaxSituation ? 'var(--brand-primary, #3B6FE8)' : '#D1D5DB',
                          padding: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: form.aiCollectTaxSituation ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', display: 'block' }} />
                      </button>
                    </div>
                  </div>
                </div>

                <label style={{ display: 'block', marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                    Questions to ask
                  </div>
                  <textarea
                    value={form.aiCustomQuestionsText}
                    onChange={(e) => setForm((prev) => ({ ...prev, aiCustomQuestionsText: e.target.value }))}
                    placeholder={'One question per line\nDid you move states this year?\nAny new dependents?\nDid you have self-employment income?'}
                    rows={5}
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
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: '#9CA3AF' }}>
                    Add up to 8 short questions. The assistant will work them in naturally when relevant.
                  </div>
                </label>

                <div style={{ border: '1px solid #E2E6F0', borderRadius: 12, background: 'white', padding: 14, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Ask for a review when client is done</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                        When you mark a client done from the profile page, TaxPing can send a closing review request automatically.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, aiReviewRequestEnabled: !prev.aiReviewRequestEnabled }))}
                      style={{
                        width: 54,
                        height: 30,
                        borderRadius: 9999,
                        border: 'none',
                        background: form.aiReviewRequestEnabled ? 'var(--brand-primary, #3B6FE8)' : '#D1D5DB',
                        padding: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: form.aiReviewRequestEnabled ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', display: 'block' }} />
                    </button>
                  </div>

                  <label style={{ display: 'block', marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8 }}>
                      Review request message
                    </div>
                    <textarea
                      value={form.aiReviewRequestMessage}
                      disabled={!form.aiReviewRequestEnabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, aiReviewRequestMessage: e.target.value.slice(0, 280) }))}
                      placeholder="If this was helpful, we would really appreciate a quick review."
                      rows={3}
                      style={{
                        width: '100%',
                        border: '1px solid #D7DCE8',
                        borderRadius: 10,
                        padding: '12px 14px',
                        fontSize: 15,
                        color: form.aiReviewRequestEnabled ? '#1A1A1A' : '#9CA3AF',
                        background: form.aiReviewRequestEnabled ? 'white' : '#F8FAFC',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </label>
                </div>
              </div>
              )}

              {activeTab === 'business' && (
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
              )}

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
                icon={<SiGoogledrive size={16} color="default" />}
                label="Google Drive"
                value={loading ? 'Loading…' : preparer.driveConnected ? 'Connected' : 'Needs setup'}
                tone={preparer.driveConnected ? 'success' : 'warning'}
                detail="Incoming client documents are saved to your Drive workspace when this connection is active."
              />
              {activeTab === 'ai' && (
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
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                      Assistant preview
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginTop: 4 }}>
                      Sample text message
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#6B7280' }}>
                  This is the kind of text your clients can expect from the assistant.
                </div>
                <div style={{
                  borderRadius: 18,
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
                      {trimmedBusinessName || 'Your business'} assistant
                    </div>
                    <div style={{
                      padding: '5px 8px',
                      borderRadius: 999,
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {selectedAiTone?.label ?? 'Friendly'}
                    </div>
                  </div>
                  <div style={{
                    maxWidth: 280,
                    borderRadius: '16px 16px 16px 6px',
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    padding: '12px 14px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#1A1A1A',
                    boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                  }}>
                    {assistantPreview}
                  </div>
                </div>
              </div>
              )}
              {activeTab === 'business' && (
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
              )}
              {activeTab === 'business' && (
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
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
