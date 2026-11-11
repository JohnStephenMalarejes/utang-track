import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata = {
  title: { default: "Utang Tracker", template: "%s · Utang Tracker" },
  description: "Track shared expenses, who owes what, and who has paid.",
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: "#222831" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster position="top-right" closeButton toastOptions={{ classNames: { toast: "font-sans" } }} />
      </body>
    </html>
  );
}
