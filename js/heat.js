/**
 * heat.js — Heat index (what the body feels), NOAA formula.
 *
 * Temperature alone does not tell how harmful heat is: with high humidity sweat does
 * not evaporate and the body cannot cool down. The heat index combines temperature and
 * relative humidity into a single number: "feels like X degrees".
 *
 * Formula: Rothfusz regression used by the US National Weather Service
 * (NOAA), https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 * It is public domain. It works in degrees Fahrenheit, so we convert at the edges.
 *
 * Stated limits:
 *  - The formula is meant for hot conditions (from about 27 °C). Below that threshold
 *    NOAA uses a simpler expression, which is not the air temperature but a
 *    combination of temperature and humidity very close to it (in cold weather it
 *    can come out a couple of degrees lower).
 *  - The switch between branches at 27 °C is not continuous, so averaging the twelve
 *    months can produce small steps. The confidence range the app publishes comes out
 *    somewhat narrower than it should.
 *  - It pairs the day's maximum with the 24-hour average humidity, and humidity drops
 *    just when heat peaks: the value tends to run high.
 *  - It is a monthly "in the shade" value: it measures typical heat, not one specific afternoon.
 */

const toF = (c) => (c * 9) / 5 + 32;
const toC = (f) => ((f - 32) * 5) / 9;

/**
 * Heat index at a given moment.
 * @param {number} tempC air temperature in °C
 * @param {number} rh relative humidity in % (0–100)
 * @returns {number} apparent temperature in °C
 */
export function heatIndexC(tempC, rh) {
  if (!Number.isFinite(tempC) || !Number.isFinite(rh)) return NaN;
  const T = toF(tempC);
  const R = Math.min(100, Math.max(0, rh));

  // Step 1: Steadman's simple formula, averaged with the temperature.
  const simple = ((0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094)) + T) / 2;
  if (simple < 80) return toC(simple); // cold regime: the index is close to the temperature

  // Step 2: full Rothfusz regression.
  let hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
    - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;

  // Step 3: NOAA adjustments at the humidity extremes.
  if (R < 13 && T >= 80 && T <= 112) hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  else if (R > 85 && T >= 80 && T <= 87) hi += ((R - 85) / 10) * ((87 - T) / 5);

  return toC(hi);
}

/**
 * Annual heat-index series from the monthly series of maximum temperature and
 * relative humidity. Each year is the mean of its 12 monthly indices;
 * a year missing any month is left without a value.
 *
 * @param {{years:number[], byMonth:(number|null)[][]}} tmax T2M_MAX series
 * @param {{years:number[], byMonth:(number|null)[][]}} rh RH2M series
 * @returns {{years:number[], annual:(number|null)[], byMonth:(number|null)[][]}}
 */
export function heatIndexSeries(tmax, rh) {
  const years = tmax?.years || [];
  const byMonth = Array.from({ length: 12 }, () => []);
  const annual = [];
  for (let i = 0; i < years.length; i++) {
    // Humidity is looked up by year: the two series may start in different years.
    const j = (rh?.years || []).indexOf(years[i]);
    let sum = 0, n = 0;
    for (let m = 0; m < 12; m++) {
      const a = tmax?.byMonth?.[m]?.[i], b = j < 0 ? null : rh?.byMonth?.[m]?.[j];
      const v = a === null || a === undefined || b === null || b === undefined ? null : heatIndexC(a, b);
      const ok = v !== null && Number.isFinite(v);
      byMonth[m].push(ok ? v : null);
      if (ok) { sum += v; n++; }
    }
    annual.push(n === 12 ? Math.round((sum / 12) * 1e6) / 1e6 : null);
  }
  return { years, annual, byMonth };
}
