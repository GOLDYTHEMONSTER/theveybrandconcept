/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Next 14.2.x bundles a compiled ua-parser-js into next/server's edge
  // build, and that bundle references __dirname — a Node global that
  // does not exist in the Edge Runtime. This throws
  // "ReferenceError: __dirname is not defined" in Vercel's middleware,
  // even though nothing in this app's own code touches __dirname or
  // ua-parser-js. Shimming it to a harmless string for edge builds only
  // is the documented workaround (tracked upstream in vercel/next.js
  // issues #53968 and #58140).
  webpack: (config, { nextRuntime, webpack }) => {
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify("/"),
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
