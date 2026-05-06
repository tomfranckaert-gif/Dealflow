import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransactlyPipeline from "@/components/TransactlyPipeline";
import type { DealWithContacts } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deals } = await supabase
    .from("deals")
    .select(`
      *,
      buyer:contacts!deals_buyer_id_fkey(name, email, phone),
      seller:contacts!deals_seller_id_fkey(name, email, phone)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <TransactlyPipeline
      deals={(deals ?? []) as DealWithContacts[]}
      userEmail={user.email ?? ""}
    />
  );
}
