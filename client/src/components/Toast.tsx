import * as ToastPrimitive from '@radix-ui/react-toast';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { clearToastEnqueue, setToastEnqueue, type ToastMessage } from './toast-store';

function ToastItem({
  toastMessage,
  onDismiss,
}: {
  toastMessage: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const success = toastMessage.variant === 'success';

  return (
    <ToastPrimitive.Root
      duration={3000}
      onOpenChange={(open) => !open && onDismiss(toastMessage.id)}
      className={cn(
        'pointer-events-auto flex min-w-60 items-center gap-2.5 rounded-lg px-4 py-3 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all',
        'data-[state=open]:translate-y-0 data-[state=open]:opacity-100',
        'data-[state=closed]:translate-y-2 data-[state=closed]:opacity-0',
        success ? 'bg-[#1A1A1A]' : 'bg-[#1A1A1A]'
      )}
    >
      {success ? (
        <CheckCircle2 size={16} className="shrink-0 text-[#22C55E]" />
      ) : (
        <AlertTriangle size={16} className="shrink-0 text-[#EF4444]" />
      )}

      <ToastPrimitive.Description className="flex-1">
        {toastMessage.message}
      </ToastPrimitive.Description>

      <ToastPrimitive.Close asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-[#6B7280] transition-colors hover:text-white"
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    setToastEnqueue((toastMessage) => {
      setToasts((current) => [...current, toastMessage]);
    });

    return () => {
      clearToastEnqueue();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toastMessage) => toastMessage.id !== id));
  }, []);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toastMessage) => (
        <ToastItem key={toastMessage.id} toastMessage={toastMessage} onDismiss={dismiss} />
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-5 right-5 z-[9999] flex w-fit max-w-[calc(100vw-40px)] flex-col items-end gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
