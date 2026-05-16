"use client";

import { useState, useTransition } from "react";
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
import { resetPasswordAction } from "@/server/actions/auth";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto">
            <Image
              src="/logo-stepalbum.svg"
              alt="StepAlbum"
              width={48}
              height={48}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Redefinir senha</CardTitle>
            <CardDescription>
              {sent
                ? "Verifique seu e-mail"
                : "Informe seu e-mail para receber o link de redefinição"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                  <Mail className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enviamos um link para o seu e-mail. Clique nele para criar uma
                  nova senha.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Button>
              </Link>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  disabled={isPending}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link
                  href="/login"
                  className="hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
