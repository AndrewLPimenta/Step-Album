// components/auth/login-background.tsx
"use client";

import Image from "next/image";

export function LoginBackground() {
  return (
    <>
      {/* Versão mobile */}
      <div className="md:hidden fixed inset-0 z-[1]">
        <Image
          src="/bg-step-mobile.svg"
          alt=""
          fill
          sizes="100vw"
          style={{ filter: "blur(80px)" }}
          className="object-cover"
          priority
          aria-hidden="true"
        />
        <div className="absolute inset-0 " aria-hidden="true" />
      </div>

      {/* Versão desktop */}
      <div className="hidden md:block fixed inset-0 z-[1]">
        <Image
          src="/bg-step.svg"
          alt=""
          fill
          sizes="100vw"
          style={{ filter: "blur(80px)" }}
          className="object-cover"
          priority
          aria-hidden="true"
        />
      </div>
    </>
  );
}
