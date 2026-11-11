/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async redirects() {
    return [
      // „kontakt” stał się częścią strony „o projekcie”
      { source: '/kontakt', destination: '/o-projekcie', permanent: true },
    ];
  },
};

export default nextConfig;
