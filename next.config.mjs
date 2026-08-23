/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
