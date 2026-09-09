/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = isDev
  ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none';"
  : // Next.js App Router streams RSC payloads to the client via inline
    // <script> tags, so script-src needs 'unsafe-inline' or hydration
    // (and every click handler on the page) silently breaks. A
    // nonce-based CSP would avoid this, but nonces require middleware
    // to inject per-request, which Next 14.2's Edge Runtime can't run
    // here (see middleware.ts removal notes).
    // img-src allows https: broadly because the product catalog links
    // directly to externally-hosted photos (the brand's CDN export) rather
    // than copies in public/ -- without this, default-src 'self' silently
    // blocks every one of those <img> tags with no network-level error.
    // script-src/frame-src/connect-src add js.stripe.com for the same
    // reason: Stripe's Payment Element loads its own script and renders
    // card fields inside a cross-origin iframe, and confirmCardPayment
    // talks to api.stripe.com directly from the browser -- none of that
    // is covered by 'self'.
    "default-src 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com";

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
