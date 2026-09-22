/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rhkjcroiowurnzxdgfvp.supabase.co',
      },
    ],
  },
  // pptxgenjs, docx, xlsx, jspdf use Node.js built-ins — keep them server-side only
  experimental: {
    serverComponentsExternalPackages: ['pptxgenjs', 'docx', 'jspdf'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub out Node.js-only modules when bundling for the browser
      const nodeModules = ['fs', 'https', 'http', 'path', 'stream', 'os',
        'crypto', 'zlib', 'url', 'events', 'util', 'assert', 'buffer',
        'net', 'tls', 'child_process', 'readline'];
      nodeModules.forEach((mod) => {
        config.resolve.alias = {
          ...config.resolve.alias,
          [`node:${mod}`]: false,
        };
      });
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, https: false, http: false,
      };
    }
    return config;
  },
};

export default nextConfig;
