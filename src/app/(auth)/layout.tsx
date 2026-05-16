import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "StepAlbum",
  description: "Diagramação Organizada",
  icons: {
    icon: "/logo-stepalbum.svg",
    apple: "/logo-stepalbum.svg",
  },
  openGraph: {
    title: "StepAlbum - Diagramação Inteligente",
    description: "desenvolvido por: Andrew",
    siteName: "StepAlbum",
    images: [
      {
        url: "/logo-stepalbum.svg",
        width: 1200,
        height: 630,
        alt: "Step-Album",
      },
    ],
    type: "website",
  },
};

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
