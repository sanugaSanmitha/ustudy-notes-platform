export type FpsIdentifierMethod = 'identifier' | 'number' | 'qr';

export type FpsConfig = {
  fpsIdentifier: string;
  fpsNumber: string;
  accountName: string;
  qrImageUrl: string | null;
  enabled: boolean;
};
