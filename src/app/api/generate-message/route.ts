import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { dealAddress, dealCity, recipientName, triggerEvent, agentName, type } = await req.json();

  let content = [
    agentName ? `Je bent makelaar ${agentName}.` : null,
    dealAddress ? `Woning: ${dealAddress}${dealCity ? ' in ' + dealCity : ''}.` : null,
    recipientName ? `Ontvanger: ${recipientName}.` : null,
    triggerEvent ? `Context: ${triggerEvent}.` : null,
    'Schrijf een kort vriendelijk WhatsApp bericht in het Nederlands. Maximaal 3 zinnen.'
  ].filter(Boolean).join(' ')

  if (type === 'daily-tip') {
    content = 'Je bent een ervaren Nederlandse makelaar. Geef één concrete tip voor vandaag. Maximaal 2 zinnen. Direct en praktisch.'
  }

  if (!content) {
    return NextResponse.json({ message: 'Goedemorgen! Veel succes vandaag.' })
  }

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
          content,
        },
      ],
    }),
  });

  const data = await response.json();
  const message = data.content?.[0]?.text ?? "";
  return NextResponse.json({ message });
}
