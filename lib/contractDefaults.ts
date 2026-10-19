// Pure utility — no React Native imports. Safe to use in cascade/lib code.

export const DEFAULT_CONTRACT_TEMPLATE = `DISCLAIMER: This is a starting template, not legal advice. Have a licensed attorney in your state review it before use.

WEDDING PHOTOGRAPHY SERVICES AGREEMENT

This Agreement is entered into as of {today_date} between {studio_name} ("Photographer") and {couple_names} ("Client").

────────────────────────────────────────────
1. PARTIES & EVENT

Studio: {studio_name}
Photographer: {photographer_name}
Client: {couple_names}
Wedding Date: {wedding_date}
Venue: {venue}
────────────────────────────────────────────

2. SCOPE OF SERVICES

Package: {package_name}
Coverage: {coverage}
Deliverables: {deliverables}

The Photographer will provide professional wedding photography services as described above. While every effort will be made to capture key moments, specific photographs cannot be guaranteed due to time, lighting, venue restrictions, or circumstances beyond the Photographer's control.

Estimated delivery: Within {delivery_window|8 weeks} of the event date.

────────────────────────────────────────────

3. PAYMENT SCHEDULE

Total Fee:               {total_price}
Non-refundable Booking Payment: {retainer}
Remaining Balance:       {balance}

The Booking Payment is due upon signing and is non-refundable under any circumstances. The remaining balance is due no later than 30 days before the event. Failure to pay by the due date may result in cancellation of services with forfeiture of the Booking Payment.

────────────────────────────────────────────

4. CANCELLATION & RESCHEDULING

Cancellation by Client: The Booking Payment is non-refundable regardless of the reason for cancellation. If cancelled more than 90 days before the event, no additional fees are owed. If cancelled within 90 days of the event, the full contract amount is due.

Cancellation by Photographer: If the Photographer must cancel due to emergency, all fees beyond the Booking Payment will be refunded and the Photographer will make reasonable efforts to locate a suitable replacement.

Rescheduling: If the event is rescheduled, the Photographer will make every effort to accommodate the new date at no additional charge. If unavailable on the new date, this will be treated as a cancellation by the Client.

────────────────────────────────────────────

5. FORCE MAJEURE

Neither party shall be liable for failure to perform due to circumstances beyond their reasonable control, including but not limited to: pandemic, natural disaster, illness, venue closure, or government-mandated restrictions. In such cases, the parties shall work in good faith to reschedule. If rescheduling is not possible, fees paid for services not yet rendered (excluding the Booking Payment) shall be refunded.

────────────────────────────────────────────

6. COPYRIGHT & USAGE

The Photographer retains full copyright to all photographs produced under this Agreement. The Client is granted a non-exclusive, personal-use license to reproduce the delivered images for personal (non-commercial) purposes including prints and personal social media sharing.

The Client may not sell, sublicense, or use the images for commercial purposes without prior written consent from the Photographer.

────────────────────────────────────────────

7. MODEL & PORTFOLIO RELEASE

By signing this Agreement, the Client grants {studio_name} permission to use photographs from this event for portfolio display, website, social media, and marketing purposes. If the Client wishes to restrict this use, written notice must be provided before the event date.

────────────────────────────────────────────

8. LIMITATION OF LIABILITY

The Photographer's total liability under this Agreement shall not exceed the total fees paid by the Client. The Photographer is not liable for equipment failure, third-party interference, or events outside their control. In the unlikely event of a complete failure to deliver, liability is limited to a full refund of all fees paid.

────────────────────────────────────────────

9. ENTIRE AGREEMENT & GOVERNING LAW

This Agreement constitutes the entire understanding between the parties and supersedes all prior discussions. It shall be governed by the laws of the State of {business_state}. Any disputes shall be resolved in {business_county}, {business_state}.

────────────────────────────────────────────

10. SIGNATURES

{studio_name} (Photographer)
Signature: ___________________________
Date: {today_date}

{couple_names} (Client)
Signature: ___________________________
Date: ____________`;

function _todayStr(): string {
  const d = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function _fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso ?? '';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dt = new Date(y, m - 1, d);
  return `${days[dt.getDay()]}, ${months[m - 1]} ${d}, ${y}`;
}

export interface ContractWeddingData {
  names:        string;
  wedding_date: string | null;
  venue:        string | null;
  package_name: string | null;
  coverage:     string | null;
  deliverables: string | null;
  delivery_days?: number | null;
  total_price:  number | null;
}

export interface ContractProfileData {
  studio_name:          string | null;
  display_name:         string | null;
  contract_template:    string | null;
  payout_business_name: string | null;
  business_state:       string | null;
  business_county:      string | null;
}

export function fillContractTemplate(
  template: string,
  wedding:  ContractWeddingData,
  profile:  ContractProfileData,
): string {
  const totalNum = wedding.total_price;
  let totalStr    = totalNum != null ? `$${totalNum.toLocaleString()}` : '[total price]';
  let retainerStr = '[booking payment amount]';
  let balanceStr  = '[balance amount]';
  if (totalNum != null && totalNum > 0) {
    const ret = Math.round(totalNum * 0.3);
    const bal = totalNum - ret;
    retainerStr = `$${ret.toLocaleString()}`;
    balanceStr  = `$${bal.toLocaleString()}`;
  }
  return template
    .replace(/\{studio_name\}/g,       profile.studio_name  ?? '')
    .replace(/\{photographer_name\}/g, profile.payout_business_name || profile.display_name || '')
    .replace(/\{couple_names\}/g,      wedding.names)
    .replace(/\{wedding_date\}/g,      _fmtDateLong(wedding.wedding_date))
    .replace(/\{venue\}/g,             wedding.venue         ?? '')
    .replace(/\{package_name\}/g,      wedding.package_name  ?? '')
    .replace(/\{total_price\}/g,       totalStr)
    .replace(/\{retainer\}/g,          retainerStr)
    .replace(/\{balance\}/g,           balanceStr)
    .replace(/\{coverage\}/g,          wedding.coverage      ?? '')
    .replace(/\{deliverables\}/g,      wedding.deliverables  ?? '')
    .replace(/\{delivery_window\|([^}]*)\}/g, (_m: string, fb: string) => wedding.delivery_days ? `${wedding.delivery_days} days` : fb)
    .replace(/\{gallery_delivery\}/g, wedding.delivery_days ? `within ${wedding.delivery_days} days of your session` : 'in a timely manner after your session')
    .replace(/\{today_date\}/g,        _todayStr())
    .replace(/\{business_state\}/g,    profile.business_state  ?? '[State]')
    .replace(/\{business_county\}/g,   profile.business_county ?? '[County]')
    // Generic aliases — used by non-wedding session-type templates so the
    // wording reads naturally ("Client" not "Couple", "Session Date" not
    // "Wedding Date") while pulling from the exact same underlying data.
    .replace(/\{client_names\}/g,      wedding.names)
    .replace(/\{session_date\}/g,      _fmtDateLong(wedding.wedding_date))
    .replace(/\{location\}/g,          wedding.venue ?? '');
}

// ── Per-session-type default templates ──────────────────────────────────────
// Rather than hand-writing a dozen full legal documents, the boilerplate
// (payment schedule, cancellation, force majeure, copyright, liability,
// governing law, signatures) is shared. Only the title, service description,
// event/location labels, delivery timeline, and cancellation window vary —
// so adding a future session type is a config row here, not a new document.

export interface ContractTypeConfig {
  title:            string;
  serviceLabel:     string; // e.g. "wedding photography services"
  eventLabel:       string; // "Wedding Date" | "Session Date" | "Proposal Date"
  locationLabel:    string; // "Venue" | "Location"
  deliveryWeeks:    number;
  cancellationDays: number; // notice window before the session that triggers full cancellation fee
}

export const CONTRACT_TYPE_CONFIG: Record<string, ContractTypeConfig> = {
  wedding:     { title: 'WEDDING PHOTOGRAPHY SERVICES AGREEMENT',        serviceLabel: 'wedding photography services',        eventLabel: 'Wedding Date',   locationLabel: 'Venue',    deliveryWeeks: 8, cancellationDays: 90 },
  engagement:  { title: 'ENGAGEMENT PHOTOGRAPHY SERVICES AGREEMENT',     serviceLabel: 'engagement photography services',     eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 14 },
  proposal:    { title: 'PROPOSAL PHOTOGRAPHY SERVICES AGREEMENT',       serviceLabel: 'proposal photography services',       eventLabel: 'Proposal Date',  locationLabel: 'Location', deliveryWeeks: 1, cancellationDays: 7  },
  maternity:   { title: 'MATERNITY PHOTOGRAPHY SERVICES AGREEMENT',      serviceLabel: 'maternity photography services',      eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 14 },
  newborn:     { title: 'NEWBORN PHOTOGRAPHY SERVICES AGREEMENT',        serviceLabel: 'newborn photography services',        eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 3, cancellationDays: 7  },
  family:      { title: 'FAMILY PORTRAIT PHOTOGRAPHY SERVICES AGREEMENT',serviceLabel: 'family portrait photography services',eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 14 },
  senior:      { title: 'SENIOR PORTRAIT PHOTOGRAPHY SERVICES AGREEMENT',serviceLabel: 'senior portrait photography services',eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 14 },
  headshots:   { title: 'HEADSHOT PHOTOGRAPHY SERVICES AGREEMENT',       serviceLabel: 'headshot photography services',       eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 1, cancellationDays: 7  },
  branding:    { title: 'PERSONAL BRANDING PHOTOGRAPHY SERVICES AGREEMENT', serviceLabel: 'personal branding photography services', eventLabel: 'Session Date', locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 7 },
  graduation:  { title: 'GRADUATION PHOTOGRAPHY SERVICES AGREEMENT',     serviceLabel: 'graduation portrait photography services', eventLabel: 'Session Date', locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 14 },
  sports_team: { title: 'TEAM & SPORTS PHOTOGRAPHY SERVICES AGREEMENT',  serviceLabel: 'team and sports photography services',eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 1, cancellationDays: 14 },
  boudoir:     { title: 'BOUDOIR PHOTOGRAPHY SERVICES AGREEMENT',        serviceLabel: 'boudoir photography services',        eventLabel: 'Session Date',   locationLabel: 'Location', deliveryWeeks: 2, cancellationDays: 7  },
};

function buildDefaultContractTemplate(cfg: ContractTypeConfig): string {
  return `DISCLAIMER: This is a starting template, not legal advice. Have a licensed attorney in your state review it before use.

${cfg.title}

This Agreement is entered into as of {today_date} between {studio_name} ("Photographer") and {client_names} ("Client").

────────────────────────────────────────────
1. PARTIES & SESSION

Studio: {studio_name}
Photographer: {photographer_name}
Client: {client_names}
${cfg.eventLabel}: {session_date}
${cfg.locationLabel}: {location}
────────────────────────────────────────────

2. SCOPE OF SERVICES

Package: {package_name}
Coverage: {coverage}
Deliverables: {deliverables}

The Photographer will provide professional ${cfg.serviceLabel} as described above. While every effort will be made to capture key moments, specific photographs cannot be guaranteed due to time, lighting, location restrictions, or circumstances beyond the Photographer's control.

Estimated delivery: Within {delivery_window|${cfg.deliveryWeeks} week${cfg.deliveryWeeks === 1 ? '' : 's'}} of the session date.

────────────────────────────────────────────

3. PAYMENT SCHEDULE

Total Fee:               {total_price}
Non-refundable Booking Payment: {retainer}
Remaining Balance:       {balance}

The Booking Payment is due upon signing and is non-refundable under any circumstances. The remaining balance is due no later than the day of the session unless otherwise agreed in writing. Failure to pay by the due date may result in cancellation of services with forfeiture of the Booking Payment.

────────────────────────────────────────────

4. CANCELLATION & RESCHEDULING

Cancellation by Client: The Booking Payment is non-refundable regardless of the reason for cancellation. If cancelled more than ${cfg.cancellationDays} days before the session, no additional fees are owed. If cancelled within ${cfg.cancellationDays} days of the session, the full contract amount is due.

Cancellation by Photographer: If the Photographer must cancel due to emergency, all fees beyond the Booking Payment will be refunded and the Photographer will make reasonable efforts to locate a suitable replacement.

Rescheduling: If the session is rescheduled, the Photographer will make every effort to accommodate the new date at no additional charge. If unavailable on the new date, this will be treated as a cancellation by the Client.

────────────────────────────────────────────

5. FORCE MAJEURE

Neither party shall be liable for failure to perform due to circumstances beyond their reasonable control, including but not limited to: pandemic, natural disaster, illness, location closure, or government-mandated restrictions. In such cases, the parties shall work in good faith to reschedule. If rescheduling is not possible, fees paid for services not yet rendered (excluding the Booking Payment) shall be refunded.

────────────────────────────────────────────

6. COPYRIGHT & USAGE

The Photographer retains full copyright to all photographs produced under this Agreement. The Client is granted a non-exclusive, personal-use license to reproduce the delivered images for personal (non-commercial) purposes including prints and personal social media sharing.

The Client may not sell, sublicense, or use the images for commercial purposes without prior written consent from the Photographer.

────────────────────────────────────────────

7. MODEL & PORTFOLIO RELEASE

By signing this Agreement, the Client grants {studio_name} permission to use photographs from this session for portfolio display, website, social media, and marketing purposes. If the Client wishes to restrict this use, written notice must be provided before the session date.

────────────────────────────────────────────

8. LIMITATION OF LIABILITY

The Photographer's total liability under this Agreement shall not exceed the total fees paid by the Client. The Photographer is not liable for equipment failure, third-party interference, or events outside their control. In the unlikely event of a complete failure to deliver, liability is limited to a full refund of all fees paid.

────────────────────────────────────────────

9. ENTIRE AGREEMENT & GOVERNING LAW

This Agreement constitutes the entire understanding between the parties and supersedes all prior discussions. It shall be governed by the laws of the State of {business_state}. Any disputes shall be resolved in {business_county}, {business_state}.

────────────────────────────────────────────

10. SIGNATURES

{studio_name} (Photographer)
Signature: ___________________________
Date: {today_date}

{client_names} (Client)
Signature: ___________________________
Date: ____________`;
}

export const DEFAULT_CONTRACT_TEMPLATES: Record<string, string> = Object.fromEntries(
  Object.entries(CONTRACT_TYPE_CONFIG).map(([key, cfg]) => [key, buildDefaultContractTemplate(cfg)])
);
