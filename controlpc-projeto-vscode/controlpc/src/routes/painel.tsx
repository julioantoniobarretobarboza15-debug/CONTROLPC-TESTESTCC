import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import {
  getCarts,
  getProfile,
  getRecentMovements,
  registerMovement,
  setMaintenance,
  type CartWithNotebooks,
  type Notebook,
} from "@/lib/controlpc.functions";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel de carrinhos — ControlPC" },
      {
        name: "description",
        content:
          "Veja os 5 carrinhos, o status de cada notebook e registre retiradas e devoluções da sala de informática.",
      },
      { property: "og:title", content: "Painel de carrinhos — ControlPC" },
      {
        property: "og:description",
        content: "Status em tempo real dos notebooks de cada carrinho da sala de informática.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PainelPage,
});

const statusStyles: Record<Notebook["status"], string> = {
  disponivel: "bg-card text-foreground border-transparent",
  retirado: "bg-transparent text-primary-foreground border-primary-foreground/50",
  manutencao: "bg-destructive text-primary-foreground border-transparent",
};

function PainelPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [activeCart, setActiveCart] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [room, setRoom] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/" });
      else setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const fetchCarts = useServerFn(getCarts);
  const fetchProfile = useServerFn(getProfile);
  const fetchMovements = useServerFn(getRecentMovements);
  const move = useServerFn(registerMovement);
  const maintenance = useServerFn(setMaintenance);

  const cartsQuery = useQuery({
    queryKey: ["carts"],
    queryFn: () => fetchCarts(),
    enabled: ready,
  });
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    enabled: ready,
  });
  const movementsQuery = useQuery({
    queryKey: ["movements"],
    queryFn: () => fetchMovements(),
    enabled: ready,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["carts"] });
    queryClient.invalidateQueries({ queryKey: ["movements"] });
  };

  const moveMutation = useMutation({
    mutationFn: (vars: { notebookId: string; kind: "retirada" | "devolucao" }) =>
      move({ data: { ...vars, room: room || undefined } }),
    onSuccess: invalidate,
  });

  const maintenanceMutation = useMutation({
    mutationFn: (vars: { notebookId: string; maintenance: boolean }) =>
      maintenance({ data: vars }),
    onSuccess: invalidate,
  });

  const carts: CartWithNotebooks[] = cartsQuery.data ?? [];
  const current = carts.find((c) => c.id === activeCart) ?? carts[0];
  const notebooks = (current?.notebooks ?? []).filter((n) =>
    search ? String(n.number).padStart(2, "0").includes(search.replace(/\D/g, "")) : true,
  );

  const total = carts.reduce((sum, c) => sum + c.notebooks.length, 0);
  const out = carts.reduce(
    (sum, c) => sum + c.notebooks.filter((n) => n.status === "retirado").length,
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-3">
        <span className="text-base font-bold tracking-tight">ControlPC</span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite o número do computador..."
          className="h-9 max-w-xs flex-1 border-0 bg-input"
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {profileQuery.data?.full_name ?? profileQuery.data?.username ?? ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs text-muted-foreground">Aparelhos / Carrinhos</p>
        <h1 className="mt-1 text-2xl font-bold">Carrinho de notebooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {out} de {total} notebooks estão fora do carrinho agora.
        </p>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 rounded-3xl bg-surface-deep p-8 shadow-soft">
            {cartsQuery.isLoading && (
              <p className="text-sm text-primary-foreground/70">Carregando notebooks...</p>
            )}
            <div className="flex flex-wrap gap-4">
              {notebooks.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() =>
                    moveMutation.mutate({
                      notebookId: n.id,
                      kind: n.status === "retirado" ? "devolucao" : "retirada",
                    })
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    maintenanceMutation.mutate({
                      notebookId: n.id,
                      maintenance: n.status !== "manutencao",
                    });
                  }}
                  title={
                    n.status === "manutencao"
                      ? "Em manutenção (clique com o botão direito para liberar)"
                      : n.status === "retirado"
                        ? "Retirado — clique para devolver"
                        : "Disponível — clique para retirar"
                  }
                  className={`flex size-20 items-center justify-center rounded-full border-2 text-sm font-semibold transition hover:scale-105 ${statusStyles[n.status]}`}
                >
                  {String(n.number).padStart(2, "0")}/{current?.notebooks.length ?? 40}
                </button>
              ))}
              {!cartsQuery.isLoading && notebooks.length === 0 && (
                <p className="text-sm text-primary-foreground/70">Nenhum notebook encontrado.</p>
              )}
            </div>
          </section>

          <aside className="w-full space-y-3 lg:w-56">
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Sala (ex: 3º Ano A)"
              className="h-10 bg-card"
            />
            {carts.map((cart) => {
              const isActive = cart.id === current?.id;
              return (
                <button
                  key={cart.id}
                  type="button"
                  onClick={() => setActiveCart(cart.id)}
                  className={`flex w-full items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 4h2l2.6 10h9.8L20 7H6" />
                    <circle cx="9" cy="19" r="1.6" />
                    <circle cx="17" cy="19" r="1.6" />
                  </svg>
                  {cart.name}
                </button>
              );
            })}
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Últimas movimentações</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {(movementsQuery.data ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap gap-2 px-4 py-3 text-sm">
                <span className="font-medium">
                  {m.kind === "retirada" ? "Retirada" : "Devolução"}
                </span>
                <span className="text-muted-foreground">
                  notebook {String(m.notebooks?.number ?? "?").padStart(2, "0")} · carrinho{" "}
                  {m.notebooks?.carts?.number ?? "?"}
                  {m.room ? ` · ${m.room}` : ""}
                </span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
            {(movementsQuery.data ?? []).length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
