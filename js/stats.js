/**
 * stats.js — Statistical engine (pure functions, no access to the page).
 *
 * Answers the core question of the challenge: is there a trend, and is it significant?
 *   - mannKendall : non-parametric test for a monotonic trend (does it rise or fall consistently?).
 *   - senSlope    : robust rate of change (median of the slopes between all pairs of years).
 *   - linReg      : least-squares regression with 95% confidence interval and t-test.
 *   - verdict     : turns the p-value into a plain-language verdict.
 *   - analyze     : applies all of the above to an annual series.
 */

// --- Distributions ---
function erf(x) { // Abramowitz-Stegun 7.1.26
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

function logGamma(x) { // Lanczos
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betaCf(a, b, x) { // continued fraction of the incomplete beta function
  const EPS = 3e-12, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function incBeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betaCf(a, b, x) / a : 1 - bt * betaCf(b, a, 1 - x) / b;
}
/** Two-sided p-value of a Student's t.
 * @param {number} t t statistic  @param {number} df degrees of freedom  @returns {number} p between 0 and 1 */
export function tTwoSidedP(t, df) {
  if (!Number.isFinite(t)) return 0;
  return incBeta(df / 2, 0.5, df / (df + t * t));
}
/** Two-sided 95% critical value of Student's t (found by bisection).
 * @param {number} df degrees of freedom */
function tCrit95(df) {
  let lo = 0, hi = 100;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (tTwoSidedP(mid, df) > 0.05) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * Mann-Kendall test with tie and continuity corrections.
 * S counts, for every pair of years, whether the later value is higher (+1) or lower (−1).
 * @param {number[]} values series ordered in time, without gaps
 * @returns {{S:number, varS:number, z:number, p:number, tau:number, n:number}} p is two-sided
 */
export function mannKendall(values) {
  const n = values.length;
  let S = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) S += Math.sign(values[j] - values[i]);
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let tieTerm = 0;
  for (const t of counts.values()) if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5);
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  let z = 0, p = 1;
  if (S !== 0 && varS > 0) {
    z = (S - Math.sign(S)) / Math.sqrt(varS);
    p = Math.min(1, 2 * (1 - normCdf(Math.abs(z))));
  }
  const pairs = n * (n - 1) / 2;
  return { S, varS, z, p, tau: pairs > 0 ? S / pairs : 0, n };
}

/** Slopes between all pairs of points, sorted from lowest to highest. */
function pairwiseSlopes(years, values) {
  const slopes = [];
  for (let i = 0; i < years.length - 1; i++)
    for (let j = i + 1; j < years.length; j++)
      if (years[j] !== years[i]) slopes.push((values[j] - values[i]) / (years[j] - years[i]));
  return slopes.sort((x, y) => x - y);
}
const median = (sorted) => { const m = sorted.length >> 1; return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2; };

/**
 * Sen slope: median of the slopes between all pairs of points.
 * A single extreme year does not distort it, unlike ordinary regression.
 * @param {number[]} years  @param {number[]} values  @returns {number} change per year
 */
export function senSlope(years, values) {
  const slopes = pairwiseSlopes(years, values);
  return slopes.length ? median(slopes) : 0;
}

/**
 * 95% confidence interval of the Sen slope (Sen's method, 1968).
 * Uses the same variance as Mann-Kendall, so the range and the verdict never contradict each other.
 * @param {number[]} years  @param {number[]} values  @param {number} varS variance of S
 * @returns {{slope:number, lo:number, hi:number}}
 */
export function senInterval(years, values, varS) {
  const slopes = pairwiseSlopes(years, values), N = slopes.length;
  if (!N) return { slope: 0, lo: 0, hi: 0 };
  const C = 1.959964 * Math.sqrt(Math.max(0, varS));
  const clamp = (k) => Math.min(N - 1, Math.max(0, k));
  return { slope: median(slopes), lo: slopes[clamp(Math.round((N - C) / 2) - 1)], hi: slopes[clamp(Math.round((N + C) / 2))] };
}

/**
 * Lag-1 autocorrelation: how much each year resembles the previous one (between −1 and 1).
 * @param {number[]} values  @returns {number}
 */
export function lag1(values) {
  const n = values.length;
  if (n < 3) return 0;
  const m = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { den += (values[i] - m) ** 2; if (i < n - 1) num += (values[i] - m) * (values[i + 1] - m); }
  return den > 1e-12 ? num / den : 0;
}

/**
 * Ordinary least-squares linear regression.
 * @param {number[]} years  @param {number[]} values
 * @returns {{slope:number, intercept:number, ciLo:number, ciHi:number, p:number}} 95% CI of the slope and t-test p
 */
export function linReg(years, values) {
  const n = years.length;
  const mx = years.reduce((a, b) => a + b, 0) / n, my = values.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (years[i] - mx) ** 2; sxy += (years[i] - mx) * (values[i] - my); }
  if (n < 3 || sxx === 0) return { slope: 0, intercept: my, ciLo: 0, ciHi: 0, p: 1 };
  const slope = sxy / sxx, intercept = my - slope * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (values[i] - (intercept + slope * years[i])) ** 2;
  const df = n - 2, se = Math.sqrt(sse / df / sxx);
  if (se < 1e-12 * Math.max(1, Math.abs(slope))) return { slope, intercept, ciLo: slope, ciHi: slope, p: slope === 0 ? 1 : 0 };
  const half = tCrit95(df) * se;
  return { slope, intercept, ciLo: slope - half, ciHi: slope + half, p: tTwoSidedP(slope / se, df) };
}

// --- Verdict ---
export const MIN_YEARS = 10;
/**
 * Plain-language verdict from the Mann-Kendall p-value.
 * p < 0.05 → 'yes' · p < 0.20 → 'maybe' · otherwise → 'none' · fewer than MIN_YEARS years → 'insufficient'.
 * @param {number} p  @param {number} n number of years with data
 */
export function verdict(p, n) {
  if (!(n >= MIN_YEARS) || !Number.isFinite(p)) return 'insufficient';
  if (p < 0.05) return 'yes';
  if (p < 0.20) return 'maybe';
  return 'none';
}

/**
 * Full analysis of an annual series. Years without data (null) are dropped.
 *
 * Autocorrelation correction: consecutive years resemble each other, which makes the test
 * see "trends" where there are only runs. The lag-1 autocorrelation r1 of the detrended
 * series is measured and, if positive, the variance of S is multiplied by (1 + r1) / (1 − r1).
 * The result is a stricter test (higher p) the more persistent the series is.
 *
 * @param {number[]} years  @param {(number|null)[]} values
 * @returns {{n:number, mk:object|null, sen:number, ci:{lo:number,hi:number}|null, intercept:number,
 *            r1:number, reg:object|null, perDecade:number, verdict:string, years:number[], values:number[]}}
 */
export function analyze(years, values) {
  const ys = [], vs = [];
  for (let i = 0; i < years.length; i++) {
    const v = values[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) { ys.push(years[i]); vs.push(v); }
  }
  const n = ys.length;
  if (n < MIN_YEARS) return { n, mk: null, sen: 0, ci: null, intercept: 0, r1: 0, reg: null, perDecade: 0, verdict: 'insufficient', years: ys, values: vs };

  const mk = mannKendall(vs), sen = senSlope(ys, vs);
  const resid = vs.map((v, i) => v - sen * ys[i]);
  const r1 = Math.min(0.9, Math.max(0, lag1(resid)));
  if (r1 > 0 && mk.varS > 0) {
    mk.varS *= (1 + r1) / (1 - r1);
    if (mk.S !== 0) {
      mk.z = (mk.S - Math.sign(mk.S)) / Math.sqrt(mk.varS);
      mk.p = Math.min(1, 2 * (1 - normCdf(Math.abs(mk.z))));
    }
  }
  const { lo, hi } = senInterval(ys, vs, mk.varS);
  const intercept = median([...resid].sort((x, y) => x - y));
  return { n, mk, sen, ci: { lo, hi }, intercept, r1, reg: linReg(ys, vs), perDecade: sen * 10, verdict: verdict(mk.p, n), years: ys, values: vs };
}
