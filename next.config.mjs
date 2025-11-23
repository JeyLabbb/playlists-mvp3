/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['sharp'],
  },
  // Configuración de favicon personalizado
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Configuración de webpack para evitar cache corrupto
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Configurar cache de webpack para invalidar cuando cambia la config
      // En ES modules, usamos import.meta.url en lugar de __filename
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [import.meta.url],
        },
      };
    }
    return config;
  },
};

export default nextConfig;
