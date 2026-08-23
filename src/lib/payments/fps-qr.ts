import QRCode from 'qrcode';
import type { FpsConfig } from '@/lib/payments/fps';

function tlv(id: string, value: string) {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

function crc16ccitt(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitizeMerchantName(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9 .,&'-]/g, ' ').trim() || 'uStudy';
  return cleaned.slice(0, 25);
}

export function buildFpsEmvPayload(input: {
  identifier: string;
  accountName: string;
  amountHkd: number;
  paymentReference: string;
}) {
  const identifier = input.identifier.replace(/\s+/g, '');
  const merchantAccount = tlv('00', 'hk.com.hkicl') + tlv('02', identifier);
  const additional = tlv('05', input.paymentReference.slice(0, 25));
  const amount = Math.max(0, input.amountHkd).toFixed(2);

  const payload =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', merchantAccount) +
    tlv('52', '0000') +
    tlv('53', '344') +
    tlv('54', amount) +
    tlv('58', 'HK') +
    tlv('59', sanitizeMerchantName(input.accountName)) +
    tlv('60', 'HK') +
    tlv('62', additional) +
    '6304';

  return payload + crc16ccitt(payload);
}

export async function createFpsQrDataUrl(fps: FpsConfig, amountHkd: number, paymentReference: string) {
  if (!fps.enabled) {
    return null;
  }

  const payload = buildFpsEmvPayload({
    identifier: fps.identifier,
    accountName: fps.accountName,
    amountHkd,
    paymentReference,
  });

  return QRCode.toDataURL(payload, {
    width: 440,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#111827', light: '#ffffff' },
  });
}
