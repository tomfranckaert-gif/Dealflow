export const welcomeEmail = (agentName: string) => `
<div style="font-family: DM Sans, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <img src="https://transactly.nl/logo.png" width="48" style="margin-bottom: 24px"/>
  <h1 style="font-size: 24px; color: #0f172a;">
    Welkom bij Transactly, ${agentName}!
  </h1>
  <p style="color: #64748b; line-height: 1.7;">
    Je account is aangemaakt. Je kunt nu je eerste deal aanmaken en beginnen met automatiseren.
  </p>
  <a href="https://transactly.nl/dashboard/new-deal"
  style="display: inline-block; background: #0284c7; color: white; padding: 12px 24px; border-radius: 8px;
  text-decoration: none; font-weight: 600; margin-top: 16px;">
    Eerste deal aanmaken →
  </a>
</div>`;

export const newDealEmail = (agentName: string, address: string) => `
<div style="font-family: DM Sans, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <h2 style="color: #0f172a;">Nieuwe deal aangemaakt</h2>
  <p style="color: #64748b;">
    ${agentName}, je deal voor <strong>${address}</strong> is aangemaakt in Transactly.
  </p>
</div>`;

export const dealClosedEmail = (agentName: string, address: string, price: number) => `
<div style="font-family: DM Sans, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <h2 style="color: #16a34a;">🎉 Deal gesloten!</h2>
  <p style="color: #64748b;">
    Gefeliciteerd ${agentName}! De deal voor <strong>${address}</strong> is gesloten
    voor € ${price.toLocaleString("nl-NL")}.
  </p>
</div>`;
