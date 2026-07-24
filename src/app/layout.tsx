export const dynamic = "force-dynamic"

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { SplashRemover } from "@/components/pwa/SplashRemover";
import { ClientErrorReporter } from "@/components/pwa/ClientErrorReporter";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ApexLeap - Performance Hub para Clubes Deportivos",
  description: "Plataforma SaaS de gestión integral para academias de artes marciales y clubes deportivos",
  applicationName: "ApexLeap",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ApexLeap",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="es" suppressHydrationWarning>
        <body
          className={`${inter.variable} font-sans antialiased`}
        >

          {/* PWA splash loader — inline so it renders before any JS/CSS bundle */}
          <div
            id="__splash"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fafafa',
              transition: 'opacity .3s ease',
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              @media(prefers-color-scheme:dark){#__splash{background:#000!important}}
              @keyframes __sp{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
              #__splash svg{animation:__sp 1.8s ease-in-out infinite}
            `}} />
            <svg width="64" height="64" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="96" fill="#34d399"/>
              <path fill="white" d="M156 352V160h56l80 120V160h64v192h-56l-80-120v120H156z"/>
            </svg>
          </div>

          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
            <RegisterServiceWorker />
            <SplashRemover />
            <ClientErrorReporter />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
