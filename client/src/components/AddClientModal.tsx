import { useState, useEffect, useRef } from 'react';
import { X, User, Phone } from 'lucide-react';
import { createClient } from '../api';
import { toast } from './Toast';

interface Props {
  preparerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_TAX_YEAR = new Date().getFullYear();
const TAX_YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => DEFAULT_TAX_YEAR + 1 - index);

function toE164(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function AddClientModal({ preparerId, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [taxYear, setTaxYear] = useState(DEFAULT_TAX_YEAR);
  const [mobileError, setMobileError] = useState('');
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSubmit = name.trim().length > 0 && mobile.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e164 = toE164(mobile);
    if (!e164) { setMobileError('Valid US mobile number required'); return; }
    setLoading(true);
    try {
      await createClient(preparerId, name.trim(), e164, taxYear);
      toast(`${name.trim()} added successfully`, 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast(msg ?? 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E2E6F0', borderRadius: 6,
    padding: '9px 12px 9px 34px', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
    fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6,
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'white', borderRadius: 10, padding: 28,
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        margin: '0 16px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Add New Client</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              They'll receive an SMS once you send a request
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#6B7280', display: 'flex' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F8FC')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary, #3B6FE8)')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E6F0')}
              />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label style={labelStyle}>Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => { setMobile(formatPhone(e.target.value)); setMobileError(''); }}
                placeholder="(555) 555-5555"
                inputMode="numeric"
                maxLength={14}
                style={{ ...inputStyle, borderColor: mobileError ? '#EF4444' : '#E2E6F0' }}
                onFocus={(e) => (e.target.style.borderColor = mobileError ? '#EF4444' : 'var(--brand-primary, #3B6FE8)')}
                onBlur={(e) => (e.target.style.borderColor = mobileError ? '#EF4444' : '#E2E6F0')}
              />
            </div>
            {mobileError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{mobileError}</div>}
          </div>

          <div>
            <label style={labelStyle}>Tax Year</label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value))}
              style={{
                ...inputStyle,
                padding: '9px 12px',
                appearance: 'none',
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                cursor: 'pointer',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary, #3B6FE8)')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E6F0')}
            >
              {TAX_YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F8FC')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background: canSubmit ? 'var(--brand-primary, #3B6FE8)' : 'var(--brand-primary, #3B6FE8)',
                opacity: canSubmit ? 1 : 0.4,
                color: 'white', padding: '8px 16px', borderRadius: 6,
                fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
                border: 'none', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = 'var(--brand-primary-dark, #2E5ED4)'; }}
              onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.background = 'var(--brand-primary, #3B6FE8)'; }}
            >
              {loading ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
