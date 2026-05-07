import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #e8ecf0",
        padding: "0 40px", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image src="/logo.png" alt="Transactly" width={32} height={32} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Transactly</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/login" style={{
            padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            color: "#64748b", border: "1px solid #e8ecf0", background: "transparent", textDecoration: "none",
          }}>Inloggen</Link>
          <Link href="/onboarding" style={{
            padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            color: "#fff", background: "#0284c7", textDecoration: "none",
          }}>Gratis proberen</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        paddingTop: "140px", paddingBottom: "80px", paddingLeft: "40px", paddingRight: "40px",
        textAlign: "center", background: "#fff",
      }}>
        <div style={{
          display: "inline-block", padding: "5px 14px", borderRadius: "999px",
          background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd",
          fontSize: "12px", fontWeight: "600", marginBottom: "24px",
        }}>
          Voor Nederlandse makelaars
        </div>

        <h1 style={{
          fontSize: "48px", fontWeight: "800", color: "#0f172a",
          letterSpacing: "-1px", lineHeight: 1.15,
          margin: "0 0 20px",
        }}>
          Van lead tot sleutel,<br />automatisch
        </h1>

        <p style={{
          fontSize: "18px", color: "#64748b", maxWidth: "520px",
          margin: "0 auto 32px", lineHeight: 1.7,
        }}>
          Transactly automatiseert je vastgoedtransacties. WhatsApp follow-up,
          Wwft dossier, documenten en overdracht — allemaal in één platform.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/onboarding" style={{
            padding: "14px 28px", borderRadius: "10px", fontSize: "15px", fontWeight: "700",
            color: "#fff", background: "#0284c7", textDecoration: "none", display: "inline-block",
          }}>Gratis 60 dagen proberen</Link>
          <Link href="/dashboard" style={{
            padding: "14px 24px", borderRadius: "10px", fontSize: "15px", fontWeight: "600",
            color: "#64748b", border: "1px solid #e8ecf0", background: "#fff",
            textDecoration: "none", display: "inline-block",
          }}>Bekijk demo</Link>
        </div>

        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "12px" }}>
          Geen creditcard nodig · AVG compliant · Nederlandse servers
        </p>
      </section>

      {/* POSITIONING BANNER */}
      <section style={{ padding: "32px 40px", background: "#0f172a" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
          <div style={{
            fontSize: "10px", color: "#94a3b8", letterSpacing: "2px",
            textTransform: "uppercase", marginBottom: "12px",
          }}>
            Belangrijk om te weten
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", margin: "0 0 12px" }}>
            Transactly vervangt Realworks niet
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
            Transactly is een automatiseringslaag bovenop Realworks. Je blijft gewoon werken
            in Realworks — Transactly zorgt voor alles wat er tussendoor gebeurt. WhatsApp follow-ups,
            Wwft risicoanalyse, voorwaarden bewaken en de overdracht afhandelen.
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "16px", maxWidth: "560px", margin: "24px auto 0",
            textAlign: "left",
          }}>
            {/* LEFT */}
            <div style={{ background: "#1e293b", borderRadius: "10px", padding: "16px" }}>
              <div style={{
                fontSize: "10px", color: "#64748b", textTransform: "uppercase",
                letterSpacing: "1px", marginBottom: "10px",
              }}>Realworks doet</div>
              {[
                "CRM en contactbeheer",
                "Publiceren op Funda",
                "Koopovereenkomst opstellen",
                "Move.nl client portal",
                "Biedlogboek",
              ].map((item) => (
                <div key={item} style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "6px" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>{item}
                </div>
              ))}
            </div>

            {/* RIGHT */}
            <div style={{ background: "#1e3a5f", border: "1px solid #0284c7", borderRadius: "10px", padding: "16px" }}>
              <div style={{
                fontSize: "10px", color: "#0284c7", textTransform: "uppercase",
                letterSpacing: "1px", marginBottom: "10px",
              }}>Transactly voegt toe</div>
              {[
                "WhatsApp automation",
                "Wwft risicobeoordeling",
                "Voorwaarden tracker",
                "Bezichtigingen + feedback",
                "Overdracht checklist",
                "AI document follow-up",
                "Verkoper weekrapport",
              ].map((item) => (
                <div key={item} style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "6px" }}>
                  <span style={{ color: "#0284c7", marginRight: "8px" }}>✓</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "60px 40px", background: "#f8fafc" }}>
        <h2 style={{
          fontSize: "28px", fontWeight: "700", color: "#0f172a",
          textAlign: "center", margin: "0 0 40px",
        }}>
          Alles wat je nodig hebt
        </h2>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px", maxWidth: "960px", margin: "0 auto",
        }}>
          {[
            { emoji: "🔄", name: "Realworks koppeling", desc: "Automatisch deals en contacten synchroniseren" },
            { emoji: "💬", name: "WhatsApp automation", desc: "AI-gegenereerde berichten op het juiste moment" },
            { emoji: "🛡", name: "Wwft compliant", desc: "Automatische identiteitscheck via Move.nl en risicoanalyse" },
            { emoji: "📄", name: "Documenten tracker", desc: "Altijd inzicht in welke documenten ondertekend zijn" },
            { emoji: "⏱", name: "Voorwaarden bewaker", desc: "Nooit meer een deadline missen" },
            { emoji: "🔑", name: "Overdracht module", desc: "Van meterstanden tot sleuteloverdracht" },
          ].map((f) => (
            <div key={f.name} style={{
              background: "#fff", border: "1px solid #e8ecf0",
              borderRadius: "12px", padding: "24px",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{f.emoji}</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{f.name}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "60px 40px", background: "#fff" }}>
        <h2 style={{
          fontSize: "28px", fontWeight: "700", color: "#0f172a",
          textAlign: "center", margin: "0 0 40px",
        }}>
          Eenvoudige prijzen
        </h2>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px", maxWidth: "800px", margin: "0 auto",
        }}>
          {/* STARTER */}
          <div style={{ border: "1px solid #e8ecf0", borderRadius: "14px", padding: "28px 24px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>STARTER</div>
            <div style={{ fontSize: "30px", fontWeight: "800", color: "#0f172a" }}>
              €199<span style={{ fontSize: "14px", fontWeight: "400", color: "#94a3b8" }}>/mnd</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", marginBottom: "20px" }}>1 gebruiker · Tot 10 deals</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: "13px", color: "#64748b", lineHeight: 2 }}>
              {["Pipeline", "Documenten", "Wwft", "WhatsApp"].map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <Link href="/onboarding" style={{
              display: "block", textAlign: "center", padding: "11px", borderRadius: "8px",
              fontSize: "13px", fontWeight: "600", color: "#0284c7",
              border: "1px solid #0284c7", textDecoration: "none",
            }}>Probeer gratis</Link>
          </div>

          {/* PRO */}
          <div style={{
            border: "2px solid #0284c7", borderRadius: "14px", padding: "28px 24px",
            boxShadow: "0 0 0 4px #e0f2fe", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
              background: "#0284c7", color: "#fff", fontSize: "11px", fontWeight: "700",
              padding: "4px 12px", borderRadius: "999px",
            }}>Meest gekozen</div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#0284c7", marginBottom: "8px" }}>PRO</div>
            <div style={{ fontSize: "30px", fontWeight: "800", color: "#0f172a" }}>
              €399<span style={{ fontSize: "14px", fontWeight: "400", color: "#94a3b8" }}>/mnd</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", marginBottom: "20px" }}>1 gebruiker · Onbeperkte deals</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: "13px", color: "#64748b", lineHeight: 2 }}>
              {["Pipeline", "Documenten", "Wwft", "WhatsApp", "Bezichtigingen", "Overdracht"].map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <Link href="/onboarding" style={{
              display: "block", textAlign: "center", padding: "11px", borderRadius: "8px",
              fontSize: "13px", fontWeight: "700", color: "#fff",
              background: "#0284c7", textDecoration: "none",
            }}>Probeer gratis</Link>
          </div>

          {/* OFFICE */}
          <div style={{ border: "1px solid #e8ecf0", borderRadius: "14px", padding: "28px 24px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>OFFICE</div>
            <div style={{ fontSize: "30px", fontWeight: "800", color: "#0f172a" }}>
              €799<span style={{ fontSize: "14px", fontWeight: "400", color: "#94a3b8" }}>/mnd</span>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", marginBottom: "20px" }}>Tot 5 gebruikers · Onbeperkte deals</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: "13px", color: "#64748b", lineHeight: 2 }}>
              {["Pipeline", "Documenten", "Wwft", "WhatsApp", "Bezichtigingen", "Overdracht", "Team management"].map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <Link href="/onboarding" style={{
              display: "block", textAlign: "center", padding: "11px", borderRadius: "8px",
              fontSize: "13px", fontWeight: "600", color: "#0284c7",
              border: "1px solid #0284c7", textDecoration: "none",
            }}>Probeer gratis</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: "40px", borderTop: "1px solid #e8ecf0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Image src="/logo.png" alt="Transactly" width={24} height={24} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>© 2025 Transactly.nl</span>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
          AVG compliant · Nederlandse servers · support@transactly.nl
        </div>
      </footer>

    </div>
  );
}
