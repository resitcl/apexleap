/**
 * Smoothcomp scraper — upcoming BJJ events in Chile.
 *
 * How it works:
 *  1. Fetch smoothcomp.com/en/events/upcoming → JSON-LD ItemList with ~1009 event URLs.
 *     The global ItemList already contains org-specific subdomain URLs, e.g.:
 *       https://jiujitsu-fest.smoothcomp.com/en/event/28741
 *       https://kimura.smoothcomp.com/en/event/XXXXX
 *  2. Filter that list keeping only URLs from the known Chilean orgs.
 *  3. Fetch only those ~5-20 events to read their SportsEvent JSON-LD.
 *  4. Cache 24 h.
 *
 * robots.txt says Crawl-delay: 10 for generic bots.
 * Fetching ~20 pages once per 24 h is well within that.
 */

import { unstable_cache } from 'next/cache'

export interface SmoothcompEvent {
  name:       string
  url:        string
  startDate:  string   // ISO 8601
  endDate:    string
  city:       string
  country:    string
  location:   string
  image:      string | null
  organizer:  string
  daysLeft:   number
}

// ─── Chilean BJJ orgs on smoothcomp ──────────────────────────────────────────
// Extend this list whenever a new Chilean org is found.
const CHILE_ORGS = [
  'jiujitsu-fest',   // Jiu-Jitsu Fest (Santiago, La Serena, …)
  'kimura',          // Torneo Kimura (Talagante)
  'cbjjd',           // CBJJD Chile
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  'Referer':         'https://smoothcomp.com/',
}

async function get(url: string, ms = 8_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(ms),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

function extractLdJson(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try { out.push(JSON.parse(m[1])) } catch { /* skip */ }
  }
  return out
}

/** Parse a SportsEvent JSON-LD block into our shape, or null if not Chilean / past. */
function parseSportsEvent(block: unknown, sourceUrl: string): SmoothcompEvent | null {
  const b = block as Record<string, unknown>
  if (b['@type'] !== 'SportsEvent') return null

  const addr    = ((b.location as Record<string, unknown>)
    ?.address) as Record<string, unknown> | null
  const country = String(addr?.addressCountry ?? '')
  if (country !== 'Chile' && country !== 'CL') return null

  const start   = String(b.startDate ?? '')
  const daysLeft = start
    ? Math.ceil((new Date(start).getTime() - Date.now()) / 86_400_000)
    : -1
  if (daysLeft < 0) return null     // skip past events

  return {
    name:      String(b.name ?? 'Evento sin nombre'),
    url:       sourceUrl,
    startDate: start,
    endDate:   String(b.endDate ?? ''),
    city:      String(addr?.addressLocality ?? ''),
    country,
    location:  String(
      addr?.description ??
      (b.location as Record<string, unknown>)?.name ?? ''
    ),
    image:     typeof b.image === 'string' ? b.image : null,
    organizer: String(
      (b.organizer as Record<string, unknown> | null)?.name ?? ''
    ),
    daysLeft,
  }
}

/** Fetch one event page, return parsed data or null. */
async function fetchEvent(url: string): Promise<SmoothcompEvent | null> {
  const html = await get(url)
  if (!html) return null
  for (const block of extractLdJson(html)) {
    const e = parseSportsEvent(block, url)
    if (e) return e
  }
  return null
}

// ─── Core ─────────────────────────────────────────────────────────────────────
async function _fetchChileEvents(): Promise<SmoothcompEvent[]> {
  // 1. Get the full global event list
  const html = await get('https://smoothcomp.com/en/events/upcoming', 15_000)
  if (!html) return []

  // 2. Extract all event URLs from the ItemList
  let allUrls: string[] = []
  for (const block of extractLdJson(html)) {
    const b = block as Record<string, unknown>
    if (b['@type'] === 'ItemList') {
      allUrls = ((b.itemListElement as Array<Record<string, unknown>>) ?? [])
        .map((item) => String(item.url ?? ''))
        .filter(Boolean)
      break
    }
  }

  if (allUrls.length === 0) return []

  // 3. Keep only URLs belonging to the Chilean orgs we care about
  const chileUrls = allUrls.filter((url) =>
    CHILE_ORGS.some((org) => url.includes(`${org}.smoothcomp.com`))
  )

  if (chileUrls.length === 0) return []

  // 4. Fetch those events in parallel (should be a small number ~5-20)
  const results = await Promise.allSettled(chileUrls.map((url) => fetchEvent(url)))

  const events: SmoothcompEvent[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) events.push(r.value)
  }

  return events
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8)
}

// ─── Exported cached function (24 h TTL) ──────────────────────────────────────
export const getSmoothcompChileEvents = unstable_cache(
  _fetchChileEvents,
  ['smoothcomp-chile-bjj-v3'],
  { revalidate: 86_400 },
)
