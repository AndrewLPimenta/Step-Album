"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

/**
 * Desktop-app-only: covers the screen with a "please connect to the
 * internet" message if the connection drops mid-session. The initial-load
 * case (opening the app while already offline) is handled separately by
 * tauri-shell/index.html, which runs before this page ever loads — this
 * only covers a drop while the site is already open. A no-op on the
 * regular website (gated behind the same data-desktop-app flag as the
 * rest of the desktop-only styling).
 */
export function OfflineGuard() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsDesktop(document.documentElement.dataset.desktopApp === "true");
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isDesktop || !isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Image
        src="/logo-stepalbum.svg"
        alt="StepAlbum"
        width={84}
        height={84}
        className="opacity-95"
      />
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Sem conexão com a internet</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Por favor, conecte-se à internet para usar o StepAlbum. Isso fecha
          sozinho assim que a conexão voltar.
        </p>
      </div>
    </div>
  );
}
