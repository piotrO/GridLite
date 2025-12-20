/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // Configure image optimization (if using external images)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Webpack configuration to handle Puppeteer
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize puppeteer and related packages for server-side
      config.externals = [
        ...config.externals,
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
      ];
    }
    return config;
  },
};

export default nextConfig;
