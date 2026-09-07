import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import StorefrontShell from "./_components/StorefrontShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "The Vey Brand",
  description: "See it. Explore it. Verify it.",
  appleWebApp: {
    capable: true,
    title: "The Vey Brand",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// viewport-fit=cover lets the dark canvas draw under the notch/status
// bar and the home-indicator area instead of leaving the browser's
// default white margins above and below the content on iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${playfair.variable} store-root font-sans`}>
      <StorefrontShell>{children}</StorefrontShell>
    </div>
  );
}
