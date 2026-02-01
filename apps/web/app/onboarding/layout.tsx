import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authConfigured =
    !!process.env.SESSION_SECRET ||
    !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (authConfigured) {
    const session = await getSession();
    if (!session) redirect("/login");

    const userId = await getUserId();
    const supabase = getSupabaseAdmin();
    if (userId && supabase) {
      const { data } = await supabase
        .from("user_onboarding")
        .select("get_to_main")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (data?.get_to_main === true) redirect("/app");
    }
  }
  return <>{children}</>;
}
