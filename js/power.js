/**
 * power.js — Access to NASA POWER data (https://power.larc.nasa.gov).
 *
 * NASA POWER provides climate series for any coordinate on the planet, built from the
 * MERRA-2 reanalysis and radiation products (SRB/CERES). The API is public:
 * NO registration or API key required.
 *
 * Response format (verified on 2026-11-14, API v2.10.0):
 *   properties.parameter.<CODE> = { "198101": 18.41, ..., "198113": 17.74, ... }
 *   The key is YYYYMM; "month 13" is an annual summary, ignored here; -999 means "no data".
 */

export const PARAMS = ['T2M', 'T2M_MAX', 'PRECTOTCORR', 'GWETROOT', 'RH2M', 'ALLSKY_SFC_SW_DWN'];
const START_YEAR = 1981;
const END_YEAR = 2025;
const BASE = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
const FILL = -999;

/**
 * Builds the monthly query URL for one point.
 * @param {number} lat latitude  @param {number} lon longitude
 * @param {number} [startYear]  @param {number} [endYear]  @returns {string}
 */
export function buildUrl(lat, lon, startYear = START_YEAR, endYear = END_YEAR) {
  const q = new URLSearchParams({
    parameters: PARAMS.join(','), community: 'AG',
    longitude: String(lon), latitude: String(lat),
    start: String(startYear), end: String(endYear), format: 'JSON',
  });
  return `${BASE}?${q}`;
}

/**
 * Turns the API response into series ready to analyse.
 * @param {object} json NASA POWER response  @param {string} param variable code
 * @returns {{years:number[], annual:(number|null)[], byMonth:(number|null)[][]}}
 *   annual[i] is the mean of the 12 months, or null if the year is missing any month;
 *   byMonth[m][i] is the value of month m (0 = January) in year years[i].
 */
export function parsePower(json, param) {
  const d = json?.properties?.parameter?.[param];
  if (!d) return { years: [], annual: [], byMonth: Array.from({ length: 12 }, () => []) };
  const years = [...new Set(Object.keys(d).map((k) => Number(k.slice(0, 4))))].sort((a, b) => a - b);
  const byMonth = Array.from({ length: 12 }, () => []);
  const annual = [];
  for (const y of years) {
    let sum = 0, n = 0;
    for (let m = 0; m < 12; m++) {
      const raw = d[`${y}${String(m + 1).padStart(2, '0')}`];
      const v = raw === undefined || raw === null || raw === FILL || !Number.isFinite(raw) ? null : raw;
      byMonth[m].push(v);
      if (v !== null) { sum += v; n++; }
    }
    // Rounded to 6 decimals: without this, two equal years differ in the last bit
    // and the Mann-Kendall test does not recognise them as a tie.
    annual.push(n === 12 ? Math.round((sum / 12) * 1e6) / 1e6 : null);
  }
  return { years, annual, byMonth };
}

/** Converts the full response: an object { CODE: series } with the 6 variables. */
export function parseAll(json) {
  return Object.fromEntries(PARAMS.map((p) => [p, parsePower(json, p)]));
}

/**
 * Downloads the data for one point. Rejects with Error('timeout' | 'network' | 'http <code>').
 * @param {number} lat  @param {number} lon  @param {{timeoutMs?:number}} [opts]  @returns {Promise<object>}
 */
export async function fetchPower(lat, lon, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(buildUrl(lat, lon), { signal: ctrl.signal });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('timeout');
    if (String(e.message).startsWith('http ')) throw e;
    throw new Error('network');
  } finally { clearTimeout(timer); }
}
