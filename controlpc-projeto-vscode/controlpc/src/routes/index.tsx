import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { signIn, signUp } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ControlPC — Login da sala de informática" },
      {
        name: "description",
        content:
          "Acesse o painel do ControlPC para registrar retiradas e devoluções dos notebooks da sala de informática.",
      },
      { property: "og:title", content: "ControlPC — Login da sala de informática" },
      {
        property: "og:description",
        content: "Controle de notebooks e carrinhos da sala de informática em um só painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function CartIllustration() {
  return (
    <svg viewBox="0 0 260 150" className="w-full max-w-xs opacity-90" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="30" y="30" width="70" height="48" rx="4" />
        <path d="M42 46h46M42 56h30" strokeWidth="2" />
        <rect x="112" y="24" width="52" height="54" rx="4" />
        <path d="M14 88h190l-14 26H28z" />
        <path d="M40 114v18M178 114v18M28 132h160" />
      </g>
      <ellipse cx="110" cy="140" rx="70" ry="5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } =
      mode === "entrar"
        ? await signIn(username, password)
        : await signUp(username, password, fullName);
    setLoading(false);

    if (authError) {
      setError(
        authError.message.includes("Invalid login")
          ? "Usuário ou senha incorretos."
          : authError.message.includes("already registered")
            ? "Esse nome de usuário já existe."
            : authError.message,
      );
      return;
    }

    // Aguarda a sessão ficar disponível antes de abrir o painel.
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    navigate({ to: "/painel" });
  }


  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-center overflow-hidden bg-hero-gradient p-14 text-primary-foreground lg:flex">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-80">
          Sala de informática
        </p>
        <h1 className="mt-4 max-w-sm text-4xl leading-tight font-bold">
          Cada notebook no lugar certo, sempre.
        </h1>
        <p className="mt-5 max-w-sm text-sm opacity-85">
          Registre retiradas e devoluções em lote, acompanhe o status dos aparelhos e organize os
          carrinhos de carregamento em um só painel.
        </p>
        <div className="mt-14 text-primary-foreground">
          <CartIllustration />
        </div>
        <p className="absolute bottom-8 left-14 text-xs opacity-70">
          ControlPC · 3º Ano A — 2026
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-surface-deep text-primary-foreground">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="12" rx="2" />
                <path d="M2 20h20" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">ControlPC</span>
          </div>

          <h2 className="mt-8 text-2xl font-bold">
            {mode === "entrar" ? "Bem-vindo de volta" : "Criar acesso"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "entrar"
              ? "Acesse o painel de controle da sala de informática."
              : "Escolha um nome de usuário e uma senha para começar."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-semibold tracking-wider uppercase">
                Nome de usuário
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: samuel.souza"
                autoComplete="username"
                required
                className="h-11 border-0 bg-input"
              />
            </div>

            {mode === "criar" && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-xs font-semibold tracking-wider uppercase">
                  Nome completo
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Samuel Souza"
                  className="h-11 border-0 bg-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                required
                minLength={6}
                className="h-11 border-0 bg-input"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg">
              {loading ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "entrar" ? "criar" : "entrar");
              setError(null);
            }}
            className="mt-6 text-sm font-medium text-primary hover:underline"
          >
            {mode === "entrar" ? "Ainda não tenho acesso" : "Já tenho uma conta"}
          </button>
        </div>
      </section>
    </main>
  );
}
