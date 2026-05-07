import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { dealAddress, dealCity, recipientName, triggerEvent, agentName } = await req.json();

  const parts: string[] = []
  if (agentName) parts.push(`Je bent makelaar ${agentName}.`)
  if (dealAddress) parts.push(`Woning: ${dealAddress}${dealCity ? ' in ' + dealCity : ''}.`)
  if (recipientName) parts.push(`Ontvanger: ${recipientName}.`)
  if (triggerEvent) parts.push(`Context: ${triggerEvent}.`)
  parts.push('Schrijf een kort vriendelijk WhatsApp bericht in het Nederlands. Maximaal 3 zinnen.')

  const prompt = parts.join(' ')

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();
  const message = data.content?.[0]?.text ?? "";
  return NextResponse.json({ message });
}
