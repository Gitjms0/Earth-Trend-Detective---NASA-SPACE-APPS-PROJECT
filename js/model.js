/**
 * model.js — Builds the "case" for a place: joins the data with the statistics.
 * It is a pure function: it takes series and returns an object ready to draw,
 * already arranged into the chapters the user sees.
 */

import { VARIABLES, CHAPTERS } from './catalog.js';
import { analyze } from './stats.js';
import { sinceBirth } from './birth.js';
import { heatIndexSeries } from './heat.js';

/**
 * Adds to the set of series those computed from others.
 * Today only felt heat, which needs the monthly series of maximum temperature and humidity.
 * If they arrive already computed (as in the example cases), they are kept.
 */
export function withDerived(parsed) {
  if (!parsed || parsed.HEATIDX) return parsed || {};
  const tmax = parsed.T2M_MAX, rh = parsed.RH2M;
  if (!tmax?.byMonth || !rh?.byMonth) return parsed;
  return { ...parsed, HEATIDX: heatIndexSeries(tmax, rh) };
}

/**
 * @param {Object<string,{years:number[], annual:(number|null)[]}>} parsed series by variable code
 * @param {{lat:number, lon:number, label:string}} place
 * @param {number|null} birthYear year of birth, or null if not given
 * @returns {{place:object, birthYear:number|null, period:{from:number|null,to:number|null},
 *            rows:object[], chapters:object[], summary:string}}
 *   Each row in rows carries { variable, years, annual, result, birth }.
 *   chapters repeats those rows grouped: { chapter, rows, featured, others, state }.
 */
export function buildCase(parsed, place, birthYear) {
  const data = withDerived(parsed);
  let from = null, to = null;

  const rows = VARIABLES.map((variable) => {
    const s = data?.[variable.code] || { years: [], annual: [] };
    const result = analyze(s.years, s.annual);
    if (result.years.length) {
      from = from === null ? result.years[0] : Math.min(from, result.years[0]);
      to = to === null ? result.years.at(-1) : Math.max(to, result.years.at(-1));
    }
    const birth = Number.isFinite(birthYear) ? sinceBirth(s.years, s.annual, birthYear) : null;
    return { variable, years: s.years, annual: s.annual, result, birth };
  });
  const byCode = Object.fromEntries(rows.map((r) => [r.variable.code, r]));

  const chapters = CHAPTERS.map((chapter) => {
    const list = chapter.codes.map((c) => byCode[c]).filter(Boolean);
    const featured = chapter.featured ? byCode[chapter.featured] : null;
    return {
      chapter,
      rows: list,
      featured: featured && featured.result.verdict !== 'insufficient'
        ? featured
        : (list.find((r) => r.result.verdict !== 'insufficient') || list[0] || null),
      state: chapterState(list),
      evidence: hasEvidence(featured, list),
      direction: chapterDirection(featured, list),
    };
  });

  const heat = chapters.find((c) => c.chapter.id === 'heat')?.evidence;
  const water = chapters.find((c) => c.chapter.id === 'water')?.evidence;
  const summary = heat && water ? 'summary.both'
    : heat ? 'summary.heat'
      : water ? 'summary.water' : 'summary.none';

  return { place, birthYear: Number.isFinite(birthYear) ? birthYear : null, period: { from, to }, rows, chapters, summary };
}

/**
 * Does the chapter have enough evidence to state it in the summary?
 * Its main variable must confirm it, or at least two variables must agree: with
 * five variables tested at 5%, a single positive one can be due to chance.
 */
function hasEvidence(featured, rows) {
  if (featured?.result.verdict === 'yes') return true;
  return rows.filter((r) => r.result.verdict === 'yes').length >= 2;
}

/**
 * Where the chapter is heading: 'up', 'down' or null if nothing is clear.
 * The main variable decides when it changes itself; otherwise, the majority of those that do.
 */
function chapterDirection(featured, rows) {
  const moving = rows.filter((r) => r.result.verdict === 'yes' || r.result.verdict === 'maybe');
  if (!moving.length) return null;
  const pick = moving.includes(featured) ? [featured] : moving;
  const sum = pick.reduce((a, r) => a + Math.sign(r.result.perDecade || 0), 0);
  return sum > 0 ? 'up' : sum < 0 ? 'down' : null;
}

/** The strongest verdict in the chapter: if any variable changes, the chapter changes. */
function chapterState(rows) {
  const order = ['yes', 'maybe', 'none', 'insufficient'];
  for (const v of order) if (rows.some((r) => r.result.verdict === v)) return v;
  return 'insufficient';
}

/** Does the case have at least one variable with enough data? (false over open ocean or near the poles) */
export function hasData(model) {
  return model.rows.some((r) => r.result.verdict !== 'insufficient');
}
