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
};

export default nextConfig;
