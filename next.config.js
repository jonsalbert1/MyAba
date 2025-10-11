/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Important: do not set output: 'export' or basePath for now
  typescript: {
    ignoreBuildErrors: false, // set true temporarily if you need to bypass TS errors
  },
  eslint: {
    ignoreDuringBuilds: true, // optional: skips eslint failures during deploy
  },
};

module.exports = nextConfig;
