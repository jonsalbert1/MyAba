/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/quiz/take/:id",
        destination: "/quiz/sub/:id",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
