import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "StockSense AI — Stop Guessing. Start Recovering.",
  description:
    "Dead Inventory Intelligence for e-commerce sellers. AI-powered actions on every product — discount, bundle, liquidate, or pause.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "StockSense AI",
    description: "AI-powered dead inventory intelligence for e-commerce.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen bg-background`}>
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
