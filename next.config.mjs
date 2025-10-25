/** @type {import('next').NextConfig} */
const nextConfig = {
  // No pongas experimental.turbopack aquí.
  webpack: (config, { isServer }) => {
    // Ignorar archivos problemáticos
    config.resolve.alias = {
      ...config.resolve.alias,
      '../../../lib/supabase/server': false,
    };
    return config;
  },
  // Desactivar el sistema de favicons de Next.js
  experimental: {
    optimizePackageImports: ['sharp'],
  },
};

export default nextConfig;
