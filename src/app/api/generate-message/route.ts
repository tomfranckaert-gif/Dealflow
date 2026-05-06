import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { dealAddress, dealCity, recipientName, triggerEvent, agentName } = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Je bent een Nederlandse makelaar genaamd ${agentName}. Schrijf een kort, professioneel maar vriendelijk WhatsApp bericht aan ${recipientName} over de woning ${dealAddress} in ${dealCity}. Context: ${triggerEvent}. Maximaal 3 zinnen. Geen aanhalingstekens. Eindig met "— ${agentName}"`,
        },
      ],
    }),
  });

  const data = await response.json();
  const message = data.content?.[0]?.text ?? "";
  return NextResponse.json({ message });
}
