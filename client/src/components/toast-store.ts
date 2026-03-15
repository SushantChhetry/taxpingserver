export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

let enqueueToast: ((toast: ToastMessage) => void) | null = null;

export function setToastEnqueue(nextEnqueueToast: (toast: ToastMessage) => void) {
  enqueueToast = nextEnqueueToast;
}

export function clearToastEnqueue() {
  enqueueToast = null;
}

export function toast(message: string, variant: ToastVariant = 'success') {
  enqueueToast?.({
    id: Math.random().toString(36).slice(2),
    message,
    variant,
  });
}
