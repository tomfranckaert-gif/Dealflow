import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PipelineBoard from "@/components/PipelineBoard";
import type { Deal } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <PipelineBoard
      initialDeals={(deals ?? []) as Deal[]}
      userEmail={user.email ?? ""}
    />
  );
}
