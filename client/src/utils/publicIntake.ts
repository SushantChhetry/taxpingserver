const DEFAULT_OPENING_TEXT = "Hi, I'm ready to send my tax documents.";

export function buildLaunchUrl(origin: string, preparerId: string): string {
  return `${origin}/public/${preparerId}/connect`;
}

export function buildSignupUrl(origin: string, preparerId: string): string {
  return `${origin}/public/${preparerId}/signup`;
}

export function buildSmsHref(
  phone: string,
  body: string = DEFAULT_OPENING_TEXT,
  userAgent?: string,
  maxTouchPoints?: number
): string {
  const isIos =
    typeof userAgent === 'string' &&
    (/(iPad|iPhone|iPod)/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && (maxTouchPoints ?? 0) > 1));
  const separator = isIos ? '&' : '?';
  return `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
}

export function buildQrImageUrl(url: string, size: number = 720): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(url)}`;
}

export function formatPhoneForDisplay(phone: string | null): string {
  if (!phone) return 'Not connected';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11 || !digits.startsWith('1')) return phone;
  return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
}
