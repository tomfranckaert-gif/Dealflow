import { NextResponse } from "next/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY!,
  "anthropic-version": "2023-06-01",
};

async function callClaude(prompt: string, maxTokens = 400) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return (data.content?.[0]?.text ?? "") as string;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type } = body;

  if (type === "seller-feedback") {
    const { dealAddress, stats } = body;
    const prompt = `Je bent een Nederlandse makelaar. Schrijf een bondige AI-samenvatting (max 4 zinnen, zakelijk maar begrijpelijk) van de bezichtigingen voor de woning ${dealAddress ?? ""}. Statistieken: ${stats}. Geef een professionele analyse met een aanbeveling. Geen aanhalingstekens, geen intro zin.`;
    const message = await callClaude(prompt, 250);
    return NextResponse.json({ message });
  }

  if (type === "weekrapport") {
    const { dealAddress, dealCity, sellerName, stats } = body;
    const prompt = `Je bent een Nederlandse makelaar. Schrijf een professioneel weekrapport e-mail in het Nederlands voor verkoper ${sellerName ?? "de verkoper"} over de woning ${dealAddress ?? ""} in ${dealCity ?? ""}. Statistieken deze week: ${stats}. Structuur: aanhef, samenvatting van de week, inzichten, volgende stappen, afsluiting. Schrijf dit als volledige e-mailtekst, klaar om te verzenden. Vriendelijk en professioneel.`;
    const message = await callClaude(prompt, 600);
    return NextResponse.json({ message });
  }

  // Default: WhatsApp message
  const { dealAddress, dealCity, recipientName, triggerEvent, agentName } = body;
  const prompt = `Je bent een Nederlandse makelaar genaamd ${agentName}. Schrijf een kort, professioneel maar vriendelijk WhatsApp bericht aan ${recipientName} over de woning ${dealAddress} in ${dealCity}. Context: ${triggerEvent}. Maximaal 3 zinnen. Geen aanhalingstekens. Eindig met "— ${agentName}"`;
  const message = await callClaude(prompt, 300);
  return NextResponse.json({ message });
}
