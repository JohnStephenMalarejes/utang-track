import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/layout/pwa-register";
import "./globals.css";

export const metadata = {
  title: { default: "Utang Tracker", template: "%s · Utang Tracker" },
  description: "Track shared expenses, who owes what, and who has paid.",
  applicationName: "Utang Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Utang Tracker",
  },
  formatDetection: {
    telephone: false,
  },
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <PwaRegister />
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{ classNames: { toast: "font-sans !rounded-lg !border-border !shadow-pop", title: "!text-[13px] !font-medium" } }}
        />
      </body>
    </html>
  );
}
