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
  // Deshabilitar cache de webpack en desarrollo si hay problemas
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Limpiar cache de webpack si hay problemas
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },
};

export default nextConfig;
