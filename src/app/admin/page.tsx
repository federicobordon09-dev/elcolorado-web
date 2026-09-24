import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import { ToastProvider } from "@/components/admin/Toast";
import { listAdminOrders, listAdminProducts, type AdminOrderListItem, type AdminProductListItem } from "@/lib/actions/admin";

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    redirect("/admin/login");
  }

  if (!claims) {
    redirect("/admin/login");
  }

  // Verify staff authorization using existing source of truth
  const { data: isStaff, error: isStaffError } = await supabase.rpc("is_staff");

  if (isStaffError) {
    redirect("/admin/login");
  }

  if (!isStaff) {
    redirect("/admin/login");
  }

  // Load data server-side for initial render (SSR)
  const [ordersResult, productsResult] = await Promise.all([
    listAdminOrders(),
    listAdminProducts(),
  ]);

  const initialOrders: AdminOrderListItem[] = ordersResult.ok ? ordersResult.data : [];
  const initialOrdersError = ordersResult.ok ? null : ordersResult.message;

  const initialProducts: AdminProductListItem[] = productsResult.ok ? productsResult.data : [];
  const initialProductsError = productsResult.ok ? null : productsResult.message;

  return (
    <ToastProvider>
      <main id="main" className="flex min-h-[70vh] flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          {/* Header */}
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line/40 bg-ink-soft/40 p-4 shadow-soft backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl uppercase tracking-tight text-cream">
                Panel Admin
              </h1>
              <p className="text-sm text-cream-dim">
                Acceso autorizado como staff verificado mediante{" "}
                <code className="rounded bg-ink/60 px-1">is_staff()</code>.
              </p>
            </div>
            <LogoutButton />
          </header>

          {/* Content with SSR data passed to client component for hydration */}
          <AdminDashboardContent
            initialOrders={initialOrders}
            initialOrdersError={initialOrdersError}
            initialProducts={initialProducts}
            initialProductsError={initialProductsError}
          />
        </div>
      </main>
    </ToastProvider>
  );
}