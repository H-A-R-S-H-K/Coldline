import type { Metadata, Viewport } from "next";
// Bundled locally: no network fetch to Google Fonts at build or dev time.
import { GeistSans } from "geist/font/sans";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BottomNav } from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";
import { BUSINESS_NAME } from "@/lib/config";
import "./globals.css";


export const metadata: Metadata = {
  title: { default: BUSINESS_NAME, template: `%s · ${BUSINESS_NAME}` },
  description: "Never lose track of a refrigeration job again.",
  applicationName: BUSINESS_NAME,
  appleWebApp: { capable: true, title: BUSINESS_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f3f5f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} antialiased`}>
        <ToastProvider>
          <main className="mx-auto min-h-dvh max-w-lg pb-[calc(env(safe-area-inset-bottom)+6rem)]">{children}</main>
          <BottomNav />
          <AutoRefresh />
        </ToastProvider>
      </body>
    </html>
  );
}
