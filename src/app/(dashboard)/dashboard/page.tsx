import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dealflow</h1>
        <span className="text-sm text-gray-400">{user.email}</span>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Pipeline</h2>
          <p className="text-gray-400 mt-1">Manage your deals and track progress.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"].map((stage) => (
            <div key={stage} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="font-medium text-sm text-gray-300 mb-3">{stage}</h3>
              <p className="text-xs text-gray-500">No deals yet</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
