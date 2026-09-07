/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = isDev
  ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none';"
  : "default-src 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'";

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Baseline security headers used to be applied in Edge middleware, but
  // Next 14.2.x's Edge Runtime bundle crashes in production (bundles a
  // compiled ua-parser-js that references __dirname — see middleware.ts
  // removal notes). next.config.js's headers() runs through Next's own
  // routing layer at build time, not the Edge Runtime, so it can't hit
  // that bug at all.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
