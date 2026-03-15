import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { Phone, User, X } from 'lucide-react';
import { createClient } from '../api';
import { cn } from '../lib/utils';
import { toast } from './toast-store';

interface Props {
  preparerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_TAX_YEAR = new Date().getFullYear();
const TAX_YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => DEFAULT_TAX_YEAR + 1 - index);
const FIELD_CLASS =
  'h-11 w-full rounded-md border border-[#E2E6F0] bg-white px-3 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[var(--brand-primary,#3B6FE8)]';
const LABEL_CLASS =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]';

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
  const nameRef = useRef<HTMLInputElement>(null);

  const canSubmit = name.trim().length > 0 && mobile.length > 0 && !loading;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const e164 = toE164(mobile);
    if (!e164) {
      setMobileError('Valid US mobile number required');
      return;
    }

    setLoading(true);

    try {
      await createClient(preparerId, name.trim(), e164, taxYear);
      toast(`${name.trim()} added successfully`, 'success');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast(message ?? 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 transition-opacity" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nameRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.12)] outline-none data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100 transition-all"
        >
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-bold text-[#1A1A1A]">Add New Client</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-[#9CA3AF]">
                They&apos;ll receive an SMS once you send a request
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[#6B7280] transition-colors hover:bg-[#F7F8FC]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
            <div>
              <label htmlFor="add-client-name" className={LABEL_CLASS}>
                Full Name
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  id="add-client-name"
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Smith"
                  required
                  className={cn(FIELD_CLASS, 'pl-[34px]')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-client-mobile" className={LABEL_CLASS}>
                Mobile Number
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                />
                <input
                  id="add-client-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(event) => {
                    setMobile(formatPhone(event.target.value));
                    setMobileError('');
                  }}
                  placeholder="(555) 555-5555"
                  inputMode="numeric"
                  maxLength={14}
                  className={cn(
                    FIELD_CLASS,
                    'pl-[34px]',
                    mobileError && 'border-[#EF4444] focus:border-[#EF4444]'
                  )}
                />
              </div>
              {mobileError ? <div className="mt-1 text-[11px] text-[#EF4444]">{mobileError}</div> : null}
            </div>

            <div>
              <label htmlFor="add-client-tax-year" className={LABEL_CLASS}>
                Tax Year
              </label>
              <select
                id="add-client-tax-year"
                value={taxYear}
                onChange={(event) => setTaxYear(Number(event.target.value))}
                className={cn(FIELD_CLASS, 'appearance-none pr-9')}
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                {TAX_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2.5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-[#E2E6F0] bg-white px-4 py-2 text-[13px] font-medium text-[#6B7280] transition-colors hover:bg-[#F7F8FC]"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'rounded-md border-0 px-4 py-2 text-[13px] font-semibold text-white transition-colors',
                  canSubmit
                    ? 'bg-[var(--brand-primary,#3B6FE8)] hover:bg-[var(--brand-primary-dark,#2E5ED4)]'
                    : 'cursor-not-allowed bg-[var(--brand-primary,#3B6FE8)] opacity-40'
                )}
              >
                {loading ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
