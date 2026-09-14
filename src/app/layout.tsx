import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Mesma familia dos textos, so' que carregada como "display": pesos maiores
// pra numeros e headlines. Era Fraunces (serifada) — saiu porque a referencia
// agora e' a tipografia da Apple, que e' sans em todos os tamanhos.
const interDisplay = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // viewport-fit=cover + as safe-area-inset-* no header/bottom-nav: sem isso
  // o fundo para antes do notch e das barras do sistema.
  viewportFit: "cover",
  // Pinta a propria barra do navegador no mobile com o tom do fundo, senao a
  // aurora termina numa faixa branca (ou preta) no topo. Next emite as duas
  // <meta name="theme-color"> com media query; navegadores que ignoram media
  // ficam com a primeira.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFF1FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"),
  title: "StepAlbum · Painel Interno de Diagramação",
  description:
    "Painel operacional e financeiro para controle de diagramação de álbuns de formatura.",
  // Safari/iOS antigo nao le theme-color: o status bar translucido faz o
  // fundo da pagina passar por baixo dele, que e' o mesmo efeito.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StepAlbum",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-navbutton-color": "#EFF1FA",
  },
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
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${interDisplay.variable}`}>
      {/* Sem inter.className aqui de proposito: aquela classe crava
          font-family fora de qualquer @layer e venceria a pilha do
          globals.css, que precisa poder por -apple-system na frente. */}
      <body className="min-h-dvh app-backdrop">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
