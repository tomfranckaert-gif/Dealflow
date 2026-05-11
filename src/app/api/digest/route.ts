import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: Request) {
  // Cron secret guard
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Fetch all agents
  const { data: agents, error: agentsError } = await supabase
    .from("agents")
    .select("id, name, email");

  if (agentsError || !agents?.length) {
    return Response.json({ error: agentsError?.message ?? "No agents" }, { status: 500 });
  }

  const results: { agent: string; status: string }[] = [];

  for (const agent of agents) {
    if (!agent.email) continue;

    try {
      // 2. Fetch data for this agent
      const { data: deals } = await supabase
        .from("deals")
        .select("id, address, agreed_price, stage")
        .eq("owner_id", agent.id)
        .neq("stage", "gesloten");

      const dealIds = (deals ?? []).map((d) => d.id);

      const [conditionsRes, viewingsRes, messagesRes] = await Promise.all([
        dealIds.length > 0
          ? supabase.from("conditions").select("id, label, deadline").in("deal_id", dealIds).eq("status", "open")
          : Promise.resolve({ data: [] }),
        dealIds.length > 0
          ? supabase.from("viewings").select("id, scheduled_at").in("deal_id", dealIds)
          : Promise.resolve({ data: [] }),
        dealIds.length > 0
          ? supabase.from("messages").select("id, status").in("deal_id", dealIds).eq("status", "concept")
          : Promise.resolve({ data: [] }),
      ]);

      const conditions = (conditionsRes.data ?? []) as { id: string; label: string; deadline: string }[];
      const viewings = (viewingsRes.data ?? []) as { id: string; scheduled_at: string }[];
      const pending = (messagesRes.data ?? []) as { id: string; status: string }[];

      // 3. Calculations
      const urgent = conditions.filter((c) =>
        Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) <= 3
      );

      const today = new Date().toDateString();
      const todayViewings = viewings.filter(
        (v) => new Date(v.scheduled_at).toDateString() === today
      );

      const courtage = (deals ?? []).reduce(
        (s, d) => s + ((d.agreed_price ?? 0) * 0.015),
        0
      );

      // 4. Email
      const h = new Date().getHours();
      const greeting = h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
      const agentName = agent.name || "Makelaar";
      const dealCount = (deals ?? []).length;

      const dateStr = new Date().toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });

      const urgentBlock = urgent.length > 0
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="font-size:10px;font-weight:700;color:#991b1b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
              🔴 URGENTE ACTIES — ${urgent.length} deadline(s) vandaag/morgen
            </div>
            ${urgent.slice(0, 3).map((c) => {
              const days = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000);
              return `<div style="padding:8px 0;border-bottom:1px solid #fee2e2;font-size:13px;color:#0f172a;">
                ⏱ ${c.label}<span style="color:#ef4444;font-weight:600;"> — verloopt ${days <= 0 ? "vandaag" : "morgen"}</span>
              </div>`;
            }).join("")}
            <a href="https://transactly.nl/dashboard" style="display:inline-block;margin-top:12px;background:#ef4444;color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
              Bekijk urgente acties →
            </a>
          </div>`
        : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#16a34a;font-weight:600;">
            ✅ Geen urgente acties vandaag
          </div>`;

      const agendaBlock = `
        <div style="background:#fff;border:1px solid #e8ecf0;border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
            📅 AGENDA VANDAAG
          </div>
          ${todayViewings.length > 0
            ? todayViewings.map((v) => `
                <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">
                  🏠 ${new Date(v.scheduled_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} — Bezichtiging
                </div>`).join("")
            : `<div style="font-size:13px;color:#94a3b8;">Geen afspraken vandaag</div>`
          }
        </div>`;

      const financiaalBlock = `
        <div style="background:#fff;border:1px solid #e8ecf0;border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">
            💰 FINANCIEEL OVERZICHT
          </div>
          <div style="display:flex;gap:16px;">
            <div>
              <div style="font-size:11px;color:#94a3b8;">Verwachte courtage</div>
              <div style="font-size:20px;font-weight:700;color:#16a34a;">€ ${Math.round(courtage).toLocaleString("nl-NL")}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#94a3b8;">Actieve deals</div>
              <div style="font-size:20px;font-weight:700;color:#0284c7;">${dealCount}</div>
            </div>
          </div>
        </div>`;

      const berichtenBlock = pending.length > 0
        ? `<div style="background:#fff;border:1px solid #e8ecf0;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
              💬 BERICHTEN
            </div>
            <div style="font-size:13px;color:#0f172a;">${pending.length} bericht(en) wachten op goedkeuring</div>
            <a href="https://transactly.nl/dashboard/whatsapp" style="display:inline-block;margin-top:10px;background:#0284c7;color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
              Berichten goedkeuren →
            </a>
          </div>`
        : "";

      const html = `
        <div style="font-family:DM Sans,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:24px;">
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e8ecf0;margin-bottom:16px;">
            <img src="https://transactly.nl/logo.png" width="40" style="margin-bottom:16px;display:block;" />
            <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 4px;">${greeting}, ${agentName} 👋</h1>
            <p style="font-size:13px;color:#94a3b8;margin:0;">${dateStr}</p>
          </div>
          ${urgentBlock}
          ${agendaBlock}
          ${financiaalBlock}
          ${berichtenBlock}
          <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px;">
            <a href="https://transactly.nl/dashboard" style="color:#0284c7;text-decoration:none;font-weight:600;">Open Transactly →</a>
            <br/>
            <span style="margin-top:6px;display:block;">© Transactly.nl · Je ontvangt dit elke ochtend om 07:00</span>
          </div>
        </div>`;

      const subject = `${greeting}, ${agentName} — ${urgent.length > 0 ? `${urgent.length} urgente acties` : "Jouw dag in één oogopslag"} | Transactly`;

      const { error: sendError } = await resend.emails.send({
        from: "Transactly <dag@transactly.nl>",
        to: agent.email,
        subject,
        html,
      });

      results.push({ agent: agent.email, status: sendError ? `error: ${sendError.message}` : "sent" });
    } catch (err) {
      results.push({ agent: agent.email, status: `exception: ${String(err)}` });
    }
  }

  return Response.json({ results });
}
