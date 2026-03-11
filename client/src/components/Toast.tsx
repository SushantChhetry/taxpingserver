import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error';
export interface ToastMessage { id: string; message: string; variant: ToastVariant; }

// module-level setter so toast() can be called imperatively
let _setter: React.Dispatch<React.SetStateAction<ToastMessage[]>> | null = null;

export function toast(message: string, variant: ToastVariant = 'success') {
  const id = Math.random().toString(36).slice(2);
  _setter?.((prev) => [...prev, { id, message, variant }]);
}

function ToastItem({ t, onDismiss }: { t: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(t.id), 300);
    }, 3000);
    return () => { cancelAnimationFrame(show); clearTimeout(hide); };
  }, [t.id, onDismiss]);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#1A1A1A', color: 'white', fontSize: 13,
        borderRadius: 8, padding: '12px 16px', minWidth: 240,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        transition: 'opacity 300ms, transform 300ms',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
      }}
    >
      {t.variant === 'success'
        ? <CheckCircle2 size={16} color="#22C55E" style={{ flexShrink: 0 }} />
        : <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
      }
      <span style={{ flex: 1 }}>{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', padding: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  _setter = setToasts;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      {toasts.map((t) => <ToastItem key={t.id} t={t} onDismiss={dismiss} />)}
    </div>
  );
}
