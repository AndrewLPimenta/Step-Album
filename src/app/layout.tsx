import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { OfflineGuard } from "@/components/providers/offline-guard";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"),
  title: "StepAlbum · Painel Interno de Diagramação",
  description:
    "Painel operacional e financeiro para controle de diagramação de álbuns de formatura.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo-stepalbum.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo-stepalbum.svg",
    apple: "/logo-stepalbum.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body className={`min-h-dvh app-backdrop ${inter.className}`}>
        {/* Marks the desktop (Tauri) build so globals.css can apply a more
            native-macOS look (rounder corners, etc.) — the web version stays
            untouched. Runs before paint, same pattern as the theme script,
            to avoid a flash of unstyled corners on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=new URLSearchParams(window.location.search);if(p.get('desktop')==='1'){localStorage.setItem('sa_desktop','1');}if(localStorage.getItem('sa_desktop')==='1'){document.documentElement.setAttribute('data-desktop-app','true');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <OfflineGuard />
        </ThemeProvider>
      </body>
    </html>
  );
}
