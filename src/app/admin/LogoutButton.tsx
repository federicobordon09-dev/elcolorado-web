"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/components/admin/Toast";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { error: showError } = useToast();

  const handleLogout = async () => {
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          showError(signOutError.message || "Error al cerrar sesión");
          return;
        }

        router.replace("/admin/login");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error inesperado";
        showError(message);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-lg border border-line/60 bg-ink-soft/60 px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-60"
      aria-busy={isPending ? "true" : "false"}
    >
      {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}