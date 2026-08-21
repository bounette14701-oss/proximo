/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autonome : démarrage sans serveur Next.js complet (Docker léger)
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Aucun upload d'images dans le MVP : pas d'optimiseur nécessaire
    unoptimized: true,
  },
};

export default nextConfig;
