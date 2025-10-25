/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivar el sistema de favicons de Next.js
  experimental: {
    optimizePackageImports: ['sharp'],
  },
};

export default nextConfig;
