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

  // Output standalone build for Docker
  output: "standalone",

  // Webpack configuration to handle browser automation packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize playwright and related packages for server-side
      config.externals = [
        ...config.externals,
        "playwright",
        "playwright-core",
        "@ghostery/adblocker-playwright",
        "sharp", // sharp is also often better externalized in docker
      ];
    }
    return config;
  },
};

export default nextConfig;
