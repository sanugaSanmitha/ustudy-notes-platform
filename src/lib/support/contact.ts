export type SupportContactConfig = {
  tawkPropertyId: string | null;
  tawkWidgetId: string | null;
  tawkEnabled: boolean;
  whatsappNumber: string | null;
  whatsappUrl: string | null;
  wechatId: string | null;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Digits only for wa.me links (e.g. 85291234567). */
export function normalizeWhatsappNumber(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits || null;
}

export function getSupportContactConfig(): SupportContactConfig {
  const tawkPropertyId = clean(process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID);
  const tawkWidgetId = clean(process.env.NEXT_PUBLIC_TAWK_WIDGET_ID) || 'default';
  const whatsappNumber = normalizeWhatsappNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER
  );
  const wechatId = clean(process.env.NEXT_PUBLIC_WECHAT_ID || process.env.WECHAT_ID);

  return {
    tawkPropertyId,
    tawkWidgetId,
    tawkEnabled: Boolean(tawkPropertyId),
    whatsappNumber,
    whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : null,
    wechatId,
  };
}

export function buildWhatsappUrl(message?: string) {
  const config = getSupportContactConfig();
  if (!config.whatsappUrl) return null;
  if (!message?.trim()) return config.whatsappUrl;
  return `${config.whatsappUrl}?text=${encodeURIComponent(message.trim())}`;
}
