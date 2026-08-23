import { existsSync } from 'fs';
import path from 'path';
import type { FpsConfig } from '@/lib/payments/fps-types';

export type { FpsConfig, FpsIdentifierMethod } from '@/lib/payments/fps-types';

const DEFAULT_QR_RELATIVE = 'images/payments/fps-qr.png';

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

function resolveQrImageUrl(): string | null {
  const configured = envValue('FPS_QR_IMAGE_URL', 'NEXT_PUBLIC_FPS_QR_IMAGE_URL');
  if (/^https?:\/\//i.test(configured)) {
    return configured;
  }

  const relative = (configured.replace(/^\//, '') || DEFAULT_QR_RELATIVE).replace(/\\/g, '/');
  const file = path.join(process.cwd(), 'public', relative);
  return existsSync(file) ? `/${relative}` : null;
}

export function getFpsConfig(): FpsConfig {
  const fpsIdentifier = envValue('FPS_IDENTIFIER', 'NEXT_PUBLIC_FPS_IDENTIFIER');
  const fpsNumber = envValue('FPS_NUMBER', 'NEXT_PUBLIC_FPS_NUMBER');
  const accountName = envValue('FPS_ACCOUNT_NAME', 'NEXT_PUBLIC_FPS_ACCOUNT_NAME') || 'uStudy';
  const qrImageUrl = resolveQrImageUrl();

  return {
    fpsIdentifier,
    fpsNumber,
    accountName,
    qrImageUrl,
    enabled: Boolean(fpsIdentifier || fpsNumber || qrImageUrl),
  };
}

export function fpsProxyForQr(fps: FpsConfig) {
  return fps.fpsIdentifier || fps.fpsNumber;
}
