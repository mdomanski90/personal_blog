/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async redirects() {
    return [
      // „kontakt” stał się częścią strony „o projekcie”
      { source: '/kontakt', destination: '/o-projekcie', permanent: true },
      // dział „opowieści” nazywa się teraz „wpisy”
      { source: '/opowiesci', destination: '/wpisy', permanent: true },
      { source: '/opowiesci/:slug', destination: '/wpisy/:slug', permanent: true },
    ];
  },
};

export default nextConfig;
