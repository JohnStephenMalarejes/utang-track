import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/layout/pwa-register";
import { UIProvider } from "@/components/layout/ui-provider";
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
  themeColor: "#F2F3F5",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const INIT_UI_SCRIPT = `(function(){try{var t=localStorage.getItem('utang-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#0B1120');}if(localStorage.getItem('utang-privacy')==='true'){document.documentElement.dataset.privacy='true';}if(localStorage.getItem('utang-sidebar-collapsed')==='true'){document.documentElement.dataset.sidebarCollapsed='true';}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_UI_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        <UIProvider>
          <PwaRegister />
          {children}
          <Toaster
            position="top-center"
            closeButton
            offset={16}
            toastOptions={{
              classNames: {
                toast:
                  "font-sans !rounded-xl !border-border !shadow-pop dark:!bg-slate-900 dark:!text-slate-100 dark:!border-slate-800",
                title: "!text-[13px] !font-medium",
                description: "dark:!text-slate-400",
              },
            }}
          />
        </UIProvider>
      </body>
    </html>
  );
}
