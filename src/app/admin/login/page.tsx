import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();

  // If already authenticated, redirect to /admin
  if (claims) {
    redirect("/admin");
  }

  return (
    <main
      id="main"
      className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12"
    >
      <LoginForm />
    </main>
  );
}
