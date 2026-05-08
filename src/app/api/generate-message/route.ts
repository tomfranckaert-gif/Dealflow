import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { dealAddress, dealCity, recipientName, triggerEvent, agentName, type } = body;

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

  if (type === 'funda-tekst') {
    content = [
      'Schrijf een professionele Funda aanbiedingstekst in het Nederlands.',
      dealAddress ? `Woning: ${dealAddress}${dealCity ? ' in ' + dealCity : ''}.` : null,
      body.propertyType ? `Type: ${body.propertyType}.` : null,
      body.price ? `Prijs: ${body.price}.` : null,
      body.highlights ? `Highlights: ${body.highlights}.` : null,
      body.details ? `Bijzonderheden: ${body.details}.` : null,
      body.tone ? `Tone of voice: ${body.tone}.` : null,
      body.length ? `Lengte: ${body.length} woorden.` : 'Lengte: 350 woorden.',
      'Structuur: korte intro, indeling per verdieping/ruimte, tuin/buitenruimte, bijzonderheden bullet lijst, afsluitende zin.',
      'Geen aanhalingstekens. Geen markdown. Alleen platte tekst.',
    ].filter(Boolean).join(' ')
  }

  if (!content) {
    return NextResponse.json({ message: 'Goedemorgen! Veel succes vandaag.' })
  }

  const isFunda = type === 'funda-tekst';

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: isFunda ? 1500 : 300,
      messages: [{ role: "user", content }],
    }),
  });

  const data = await response.json();
  const message = data.content?.[0]?.text ?? "";
  return NextResponse.json({ message });
}
