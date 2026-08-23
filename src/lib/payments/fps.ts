import { existsSync } from 'fs';
import path from 'path';

export type FpsConfig = {
  fpsNumber: string;
  accountName: string;
  qrImageUrl: string | null;
  enabled: boolean;
};

const DEFAULT_QR_PATH = '/images/payments/fps-qr.png';

export function getFpsConfig(): FpsConfig {
  const fpsNumber = (process.env.FPS_NUMBER || process.env.NEXT_PUBLIC_FPS_NUMBER || '').trim();
  const accountName = (process.env.FPS_ACCOUNT_NAME || process.env.NEXT_PUBLIC_FPS_ACCOUNT_NAME || 'uStudy').trim();
  const qrImageUrl = (process.env.FPS_QR_IMAGE_URL || process.env.NEXT_PUBLIC_FPS_QR_IMAGE_URL || '').trim();
  const defaultFile = path.join(process.cwd(), 'public', 'images', 'payments', 'fps-qr.png');

  return {
    fpsNumber,
    accountName,
    qrImageUrl: qrImageUrl || (existsSync(defaultFile) ? DEFAULT_QR_PATH : null),
    enabled: true,
  };
}
