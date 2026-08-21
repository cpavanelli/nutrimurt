import { ptBR } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

/**
 * The SPA pulled these from a Google Fonts <link> in index.html. `next/font`
 * self-hosts them instead, which removes the render-blocking request and the
 * flash it caused. The CSS variables feed the `--font-sans` / `--font-mono`
 * theme tokens in globals.css.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

/**
 * Reproduces the icon and manifest links that were hand-written in the SPA's
 * index.html. Next serves these from `public/`, so the paths are unchanged.
 */
export const metadata: Metadata = {
  title: "Nutrimurt",
  description: "Nutrição simples e personalizada.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2E7D32",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={ptBR}
      signInUrl="/sign-in"
      afterSignOutUrl="/sign-in"
    >
      <html lang="pt-BR" className={`${dmSans.variable} ${dmMono.variable}`}>
        <body>
          {children}
          <ToastContainer position="top-right" theme="dark" autoClose={3000} />
        </body>
      </html>
    </ClerkProvider>
  );
}
