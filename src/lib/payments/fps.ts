import { existsSync } from 'fs';
import path from 'path';

export type FpsConfig = {
  identifier: string;
  accountName: string;
  qrImageUrl: string | null;
  enabled: boolean;
};

const DEFAULT_QR_PATH = '/images/payments/fps-qr.png';

export function getFpsConfig(): FpsConfig {
  const identifier = (process.env.FPS_IDENTIFIER || process.env.NEXT_PUBLIC_FPS_IDENTIFIER || '').trim();
  const accountName = (process.env.FPS_ACCOUNT_NAME || process.env.NEXT_PUBLIC_FPS_ACCOUNT_NAME || 'uStudy').trim();
  const qrImageUrl = (process.env.FPS_QR_IMAGE_URL || process.env.NEXT_PUBLIC_FPS_QR_IMAGE_URL || '').trim();
  const defaultFile = path.join(process.cwd(), 'public', 'images', 'payments', 'fps-qr.png');

  return {
    identifier,
    accountName,
    qrImageUrl: qrImageUrl || (existsSync(defaultFile) ? DEFAULT_QR_PATH : null),
    enabled: true,
  };
}
