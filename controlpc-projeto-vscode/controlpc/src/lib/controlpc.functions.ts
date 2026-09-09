import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotebookStatus = "disponivel" | "retirado" | "manutencao";

export type Notebook = {
  id: string;
  number: number;
  status: NotebookStatus;
};

export type CartWithNotebooks = {
  id: string;
  number: number;
  name: string;
  notebooks: Notebook[];
};

export const getCarts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: carts, error: cartsError } = await context.supabase
      .from("carts")
      .select("id, number, name")
      .order("number");
    if (cartsError) throw new Error(cartsError.message);

    const { data: notebooks, error: notebooksError } = await context.supabase
      .from("notebooks")
      .select("id, cart_id, number, status")
      .order("number");
    if (notebooksError) throw new Error(notebooksError.message);

    return (carts ?? []).map((cart) => ({
      ...cart,
      notebooks: (notebooks ?? [])
        .filter((n) => n.cart_id === cart.id)
        .map((n) => ({
          id: n.id,
          number: n.number,
          status: n.status as NotebookStatus,
        })),
    })) satisfies CartWithNotebooks[];
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    return data ?? { username: "usuario", full_name: null };
  });

const moveSchema = z.object({
  notebookId: z.string().uuid(),
  kind: z.enum(["retirada", "devolucao"]),
  room: z.string().max(60).optional(),
});

export const registerMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => moveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const nextStatus: NotebookStatus =
      data.kind === "retirada" ? "retirado" : "disponivel";

    const { error: updateError } = await context.supabase
      .from("notebooks")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", data.notebookId);
    if (updateError) throw new Error(updateError.message);

    const { error: moveError } = await context.supabase.from("movements").insert({
      notebook_id: data.notebookId,
      user_id: context.userId,
      kind: data.kind,
      room: data.room ?? null,
    });
    if (moveError) throw new Error(moveError.message);

    return { status: nextStatus };
  });

const maintenanceSchema = z.object({
  notebookId: z.string().uuid(),
  maintenance: z.boolean(),
});

export const setMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => maintenanceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const nextStatus: NotebookStatus = data.maintenance ? "manutencao" : "disponivel";
    const { error } = await context.supabase
      .from("notebooks")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", data.notebookId);
    if (error) throw new Error(error.message);
    return { status: nextStatus };
  });

export const getRecentMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("movements")
      .select("id, kind, room, created_at, notebooks(number, carts(number))")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
