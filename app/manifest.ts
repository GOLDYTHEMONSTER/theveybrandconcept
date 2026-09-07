import type { MetadataRoute } from "next";

// Lets visitors "Add to Home Screen" and open /store as a standalone
// app with no Safari chrome, so viewport-fit=cover and the safe-area
// padding in StorefrontShell actually have something to draw into.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Vey Brand",
    short_name: "The Vey Brand",
    description: "See it. Explore it. Verify it.",
    start_url: "/store",
    scope: "/store/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
