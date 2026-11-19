/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async headers() {
    return [
      // P7b-2 (TER-06): service worker aplikacji „w terenie” leży w katalogu głównym (strony /keystatic bez sesji przekierowuje
      // proxy.ts, a przekierowanego pliku przeglądarka nie przyjmie), ale działa tylko w zakresie /keystatic/teren
      { source: '/teren-sw.js', headers: [{ key: 'Service-Worker-Allowed', value: '/keystatic/teren' }, { key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
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
