import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: agent } = await supabase
    .from("agents")
    .select("name, office_name")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <Sidebar userEmail={user.email ?? ""} agentName={agent?.name ?? null} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
