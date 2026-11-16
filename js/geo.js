/**
 * geo.js — Place search.
 *
 * Two services, both free, keyless and based on OpenStreetMap:
 *   - Photon (photon.komoot.io) for suggestions while typing, which is exactly
 *     what it is built for.
 *   - Nominatim to resolve a full name when the user did not pick a suggestion.
 * If suggestions fail, search keeps working: they are two separate paths.
 */

/** Takes the first Nominatim result. @returns {{lat:number, lon:number, label:string}|null} */
export function parseGeocode(json) {
  if (!Array.isArray(json) || !json.length) return null;
  const r = json[0], lat = Number(r.lat), lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: r.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
}
/** Searches a place by name. Empty text → null without using the network. @returns {Promise<{lat:number, lon:number, label:string}|null>} */
export async function searchPlace(query, lang = 'es') {
  const q = (query || '').trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=${lang}&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000); // search must not leave the page waiting
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('network');
    return parseGeocode(await res.json());
  } finally { clearTimeout(timer); }
}

/** Builds a readable label from the properties Photon returns. */
function photonLabel(p) {
  const parts = [p.name, p.city && p.city !== p.name ? p.city : null, p.state, p.country];
  return [...new Set(parts.filter(Boolean))].join(', ');
}

/**
 * Turns the Photon response into suggestions ready to show.
 * @param {object} json  @returns {{lat:number, lon:number, label:string}[]}
 */
export function parseSuggestions(json) {
  const out = [], seen = new Set();
  for (const f of json?.features || []) {
    const [lon, lat] = f?.geometry?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const label = photonLabel(f.properties || {});
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ lat, lon, label });
  }
  return out;
}

/**
 * Suggestions for what the user has typed so far. Below 3 letters it does not query.
 * Never throws: if the service fails, it returns an empty list and normal search carries on.
 * @param {string} query  @param {'es'|'en'} lang  @param {{signal?:AbortSignal}} [opts]
 * @returns {Promise<{lat:number, lon:number, label:string}[]>}
 */
export async function suggestPlaces(query, lang = 'es', { signal } = {}) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  const url = `https://photon.komoot.io/api/?limit=6&lang=${lang === 'es' ? 'es' : 'en'}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    return parseSuggestions(await res.json());
  } catch { return []; }
}

/**
 * Name of a point from its coordinates, in the requested language.
 * It serves two purposes: naming a point tapped on the globe or the map, and
 * fetching the name again when the user switches the page language.
 * Never throws: on failure it returns null and any existing name is kept.
 * @param {number} lat  @param {number} lon  @param {'es'|'en'} lang
 * @returns {Promise<string|null>}
 */
export async function nameOfPoint(lat, lon, lang = 'es') {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=${lang}&lat=${lat}&lon=${lon}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.display_name || null;
  } catch { return null; } finally { clearTimeout(timer); }
}

/**
 * The name of a place in the page language.
 * Example places carry their name in both languages ({es, en}); searched places
 * carry a single text, which is used as is.
 * @param {{label: string|{es:string,en:string}}} place  @param {'es'|'en'} lang
 */
export function labelOf(place, lang = 'es') {
  const l = place?.label;
  if (!l) return '';
  return typeof l === 'string' ? l : (l[lang] || l.es || Object.values(l)[0] || '');
}
