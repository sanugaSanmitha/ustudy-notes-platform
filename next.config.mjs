/** @type {import('next').NextConfig} */
// Security headers are applied to every route. HSTS is sent only on Vercel.
const isVercel = process.env.VERCEL === '1';
const isProd = process.env.NODE_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isProd ? '' : "'unsafe-eval'",
    'https://embed.tawk.to',
    'https://*.tawk.to',
  ]
    .filter(Boolean)
    .join(' '),
  "style-src 'self' 'unsafe-inline' https://embed.tawk.to",
  "img-src 'self' data: blob: https://*.supabase.co https://*.tawk.to",
  "font-src 'self' data: https://embed.tawk.to https://*.tawk.to",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tawk.to wss://*.tawk.to",
  "frame-src 'self' blob: https://*.supabase.co https://*.tawk.to",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isVercel ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ...(isVercel
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    optimizePackageImports: ['lucide-react', 'recharts'],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async redirects() {
    return [
      {
        source: '/profile/personal',
        destination: '/profile',
        permanent: true,
      },
      {
        source: '/profile/personal/:path*',
        destination: '/profile',
        permanent: true,
      },
      {
        source: '/materials',
        destination: '/notes/upload',
        permanent: true,
      },
      {
        source: '/materials/:path*',
        destination: '/notes/upload',
        permanent: true,
      },
      {
        source: '/support/grades',
        destination: '/admin/support',
        permanent: true,
      },
      {
        source: '/support/grades/:path*',
        destination: '/admin/support',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
