import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PipelinePage from "@/components/PipelinePage";
import type { DealWithContacts } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deals } = await supabase
    .from("deals")
    .select(`*,
      buyer:contacts!deals_buyer_id_fkey(*),
      seller:contacts!deals_seller_id_fkey(*)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return <PipelinePage deals={(deals ?? []) as DealWithContacts[]} />;
}
