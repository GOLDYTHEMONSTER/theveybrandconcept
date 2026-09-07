import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import StorefrontShell from "./_components/StorefrontShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "The Vey Brand",
  description: "See it. Explore it. Verify it.",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${playfair.variable} store-root font-sans`}>
      <StorefrontShell>{children}</StorefrontShell>
    </div>
  );
}
