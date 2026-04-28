import type { Metadata } from "next";
import { Toaster } from "sonner";
import "../styles/globals.css";
import { ToastBridge } from "@/components/ToastBridge";

export const metadata: Metadata = {
  title: "DropFlow AI — Automated dropshipping",
  description: "AI-powered dropshipping automation: stores, products, orders, and ads — on autopilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-grid">
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
        <ToastBridge />
      </body>
    </html>
  );
}
