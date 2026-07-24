/**
 * Smoothcomp scraper — upcoming BJJ events in Chile.
 *
 * How it works:
 *  1. Fetch smoothcomp.com/en/events/upcoming (HTTP 200 for scrapers).
 *  2. That page embeds the full listing as an inline JS array:
 *       var events = [{ id, title, url, startdate, enddate,
 *                       location_country, location_city, days_to_start, ... }]
 *     We parse that blob directly — it already carries country + dates, so we
 *     filter to location_country === 'CL' without any further requests.
 *  3. Cache 24 h.
 *
 * Why not read each event's detail page?
 *  The per-event pages (both org subdomains and the root domain) are now behind
 *  Cloudflare and return HTTP 403 to bots. The aggregate listing stays open, and
 *  it already contains everything we need — including Chilean events hosted on the
 *  root smoothcomp.com domain, which the old org-subdomain allowlist missed.
 *
 * robots.txt says Crawl-delay: 10 for generic bots.
 * Fetching one page per 24 h is well within that.
 */

import { unstable_cache } from 'next/cache'

export interface SmoothcompEvent {
  name:       string
  url:        string
  startDate:  string   // ISO 8601 (date, e.g. "2026-07-25")
  endDate:    string
  city:       string
  country:    string
  location:   string
  image:      string | null
  organizer:  string
  daysLeft:   number
}

const UPCOMING_URL = 'https://smoothcomp.com/en/events/upcoming'

// Shape of one entry in the page's inline `var events = [...]` array.
interface RawEvent {
  id:                     number
  title:                  string
  url:                    string
  cover_image:            string | null
  startdate:              string
  enddate:                string
  location_country:       string   // ISO code, e.g. "CL"
  location_country_human: string   // e.g. "Chile"
  location_city:          string
  days_to_start:          number
  eventEnded:             boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  'Referer':         'https://smoothcomp.com/',
}

async function get(url: string, ms = 15_000): Promise<string | null> {
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

/**
 * Extract the inline `var events = [ ... ]` array from the upcoming page.
 * Balances brackets while respecting string literals so it survives commas and
 * brackets inside titles/URLs. Returns [] if the marker isn't found.
 */
function extractEventsBlob(html: string): RawEvent[] {
  const marker = 'var events = ['
  const markerIdx = html.indexOf(marker)
  if (markerIdx === -1) return []

  const start = html.indexOf('[', markerIdx)
  let depth = 0
  let inStr = false
  let esc = false
  let quote = ''
  let end = -1

  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === quote) inStr = false
      continue
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue }
    if (c === '[') depth++
    else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break } }
  }

  if (end === -1) return []
  try {
    return JSON.parse(html.slice(start, end)) as RawEvent[]
  } catch {
    return []
  }
}

/** Capitalize each word of a city name (source is inconsistently cased). */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\p{L}/gu, (ch) => ch.toUpperCase())
    .trim()
}

/** Derive a human org name from the event's subdomain, if any. */
function orgFromUrl(url: string): string {
  const m = url.match(/https?:\/\/([a-z0-9-]+)\.smoothcomp\.com/i)
  const sub = m?.[1]
  if (!sub || sub === 'www') return ''
  return titleCase(sub.replace(/-/g, ' '))
}

function toEvent(raw: RawEvent): SmoothcompEvent {
  const city = titleCase(raw.location_city ?? '')
  const country = raw.location_country_human || 'Chile'
  return {
    name:      raw.title || 'Evento sin nombre',
    url:       raw.url,
    startDate: raw.startdate || '',
    endDate:   raw.enddate || '',
    city,
    country,
    location:  [city, country].filter(Boolean).join(', '),
    image:     raw.cover_image || null,
    organizer: orgFromUrl(raw.url),
    daysLeft:  Number.isFinite(raw.days_to_start) ? raw.days_to_start : 0,
  }
}

// ─── Core ─────────────────────────────────────────────────────────────────────
async function _fetchChileEvents(): Promise<SmoothcompEvent[]> {
  const html = await get(UPCOMING_URL)
  if (!html) return []

  const raw = extractEventsBlob(html)
  if (raw.length === 0) return []

  return raw
    .filter((e) =>
      (e.location_country === 'CL' || e.location_country_human === 'Chile') &&
      !e.eventEnded &&
      e.days_to_start >= 0,
    )
    .map(toEvent)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8)
}

// ─── Exported cached function (24 h TTL) ──────────────────────────────────────
export const getSmoothcompChileEvents = unstable_cache(
  _fetchChileEvents,
  ['smoothcomp-chile-bjj-v4'],
  { revalidate: 86_400 },
)
