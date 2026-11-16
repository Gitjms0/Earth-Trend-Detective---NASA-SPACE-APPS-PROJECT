/**
 * birth.js — "Your climate since you were born".
 *
 * Compares the mean of the user's first 10 years of life with that of the 10 most
 * recent years. It only uses measured data: it projects and forecasts nothing.
 */

import { analyze } from './stats.js';

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const valid = (v) => v !== null && v !== undefined && Number.isFinite(v);

/**
 * @param {number[]} years  @param {(number|null)[]} values annual series
 * @param {number} birthYear year of birth  @param {number} [window=10] size of each window, in years
 * @returns {{status:'ok'|'tooRecent'|'insufficient', fromYear:number|null, toYear:number|null,
 *            clamped:boolean, early:number|null, recent:number|null, diff:number|null, verdict:string}}
 *   clamped = true when the person was born before the first year with data.
 */
export function sinceBirth(years, values, birthYear, window = 10) {
  const empty = { status: 'insufficient', fromYear: null, toYear: null, clamped: false, early: null, recent: null, diff: null, verdict: 'insufficient' };
  if (!Number.isFinite(birthYear)) return empty;
  const firstIdx = values.findIndex(valid);
  if (firstIdx < 0) return empty;
  const firstYear = years[firstIdx], toYear = years[years.length - 1];
  const fromYear = Math.max(Math.trunc(birthYear), firstYear);
  const clamped = birthYear < firstYear;
  const base = { ...empty, fromYear, toYear, clamped };
  if (toYear - fromYear + 1 < 2 * window) return { ...base, status: 'tooRecent' };

  const pick = (lo, hi) => values.filter((v, i) => years[i] >= lo && years[i] <= hi && valid(v));
  const earlyVals = pick(fromYear, fromYear + window - 1);
  const recentVals = pick(toYear - window + 1, toYear);
  if (earlyVals.length < window / 2 || recentVals.length < window / 2) return base;

  const ys = [], vs = [];
  years.forEach((y, i) => { if (y >= fromYear) { ys.push(y); vs.push(values[i]); } });
  const early = mean(earlyVals), recent = mean(recentVals);
  return { ...base, status: 'ok', early, recent, diff: recent - early, verdict: analyze(ys, vs).verdict };
}
