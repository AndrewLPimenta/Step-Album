import { LoginForm } from "@/components/auth/login-form";
import { LoginBackground } from "@/components/auth/login-background";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMap: Record<string, string> = {
    inactive: "Sua conta está desativada. Fale com um admin.",
    forbidden: "Você não tem permissão para acessar essa área.",
  };
  const defaultError = params.error ? errorMap[params.error] : undefined;

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr] relative">
      {/* Camada 2 (z-[1]): Imagem de fundo */}
      <LoginBackground />

      {/* Coluna 1: Espaçador invisível para a imagem */}
      <div className="hidden md:block min-h-dvh" aria-hidden="true" />

      {/* Coluna 2: Container do form */}
      <div
        className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8 relative z-10 md:bg-background min-h-dvh"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >
        {/* Wave - apenas desktop */}
        <svg
          className="hidden md:block absolute top-0 left-0 h-full pointer-events-none"
          style={{
            width: "70%",
            left: "45%",
            transform: "translateX(-99%)",
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 100 0 L 22.5 0 C 45 30, 0 68, 15 100 L 100 100 Z"
            fill="hsl(var(--background))"
          />
        </svg>

        {/* Card de login - centralizado na coluna */}
        <div className="w-full max-w-[400px] sm:max-w-md lg:max-w-lg relative z-20">
          <LoginForm defaultError={defaultError} />
        </div>
      </div>
    </div>
  );
}
