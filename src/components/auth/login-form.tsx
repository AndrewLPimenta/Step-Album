"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { signInAction } from "@/server/actions/auth";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function LoginForm({ defaultError }: { defaultError?: string }) {
  const [error, setError] = useState<string | undefined>(defaultError);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
      } else if (result.data?.redirectTo) {
        router.push(result.data.redirectTo);
      }
    });
  }

  return (
    <Card className="w-full max-w-[95%] xs:max-w-[90%] sm:max-w-sm lg:max-w-lg mx-auto animate-slide-up shadow-xl bg-background">
      <CardHeader className="space-y-3 text-center px-3 sm:px-6">
        <div className="mx-auto">
          <Image
            src="/logo-stepalbum.svg"
            alt="StepAlbum"
            width={78}
            height={78}
            className="rounded-xl sm:w-14 sm:h-14"
          />
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-lg sm:text-xl">StepAlbum</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Entre com sua conta para acessar o painel
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              disabled={isPending}
              className="text-base sm:text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={isPending}
                className="pr-10 text-base sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs sm:text-sm text-destructive animate-fade-in break-words">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full text-sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Precisa trocar a senha?{" "}
            <Link
              href="/forgot-password"
              className="hover:text-foreground underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Clique aqui.
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
