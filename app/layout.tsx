import type { Metadata } from "next";
import ClientProviders from "./components/ClientProviders";
import "./erp.css";

export const metadata: Metadata = {
  title: "Veronica Young | Business Suite",
  description: "Private operations workspace for Veronica Young Brand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ClientProviders>{children}</ClientProviders></body>
    </html>
  );
}
