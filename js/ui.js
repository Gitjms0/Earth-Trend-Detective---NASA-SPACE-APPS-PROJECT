/**
 * ui.js — Drawing of the case file: stripes, verdicts, chart, comparison and image.
 *
 * The calculation functions (stripeColors, formatRate, compareRows) are pure and can be tested on their own.
 * The render* functions write HTML into a container. Every text that comes from outside
 * (for example, the place name) goes through esc() to prevent HTML injection.
 */

import { CHAPTERS, t, unitOf } from './catalog.js';
import { TEAM, sealImage } from './brand.js';

const PALETTES = {
  heat: ['#2166ac', '#f7f7f7', '#b2182b'],
  water: ['#8c510a', '#f5f5f5', '#01665e'],
  sun: ['#4d5a6b', '#f5f5f5', '#d98e04'],
};
const GRAY = '#d0d0d0';
// Colours with enough contrast to be read on a light background.
const VERDICT_COLOR = { yes: '#b91c1c', maybe: '#92400e', none: '#475569', insufficient: '#475569' };

/**
 * The verdict, stating which way the change goes. Without a direction, a chapter that
 * asks "more or less water?" answered "yes, it is changing" and read the wrong way round.
 */
export function verdictKey(result) {
  const s = Math.sign(result.perDecade || 0);
  if ((result.verdict === 'yes' || result.verdict === 'maybe') && s !== 0)
    return `verdict.${result.verdict}.${s > 0 ? 'up' : 'down'}`;
  return `verdict.${result.verdict}`;
}

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * k));
const isNum = (v) => v !== null && v !== undefined && Number.isFinite(v);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * One colour per year, according to how far that year is from the series mean
 * (symmetric scale of ±2 standard deviations). Years without data are shown in grey.
 * @param {(number|null)[]} values  @param {'heat'|'water'|'sun'} palette  @returns {string[]} #rrggbb colours
 */
export function stripeColors(values, palette) {
  const [lo, mid, hi] = PALETTES[palette] || PALETTES.heat;
  const nums = values.filter(isNum);
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const sd = nums.length ? Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length) : 0;
  return values.map((v) => {
    if (!isNum(v)) return GRAY;
    const k = sd > 0 ? Math.max(-1, Math.min(1, (v - mean) / (2 * sd))) : 0;
    return k < 0 ? mix(mid, lo, -k) : mix(mid, hi, k);
  });
}

/** Number with the language's decimals and separator; `signed` prepends + or −. */
export function formatNum(x, decimals, lang, signed = false) {
  const abs = Math.abs(x).toFixed(decimals);
  const body = lang === 'en' ? abs : abs.replace('.', ',');
  const zero = Number(abs) === 0;
  const sign = !signed || zero ? (x < 0 && !zero ? '−' : '') : x < 0 ? '−' : '+';
  return sign + body;
}

/** Rate per decade ready to show, e.g. "+0.3 °C per decade". */
export function formatRate(perDecade, unit, decimals, lang) {
  return `${formatNum(perDecade, decimals, lang, true)} ${unit} ${t(lang, 'case.perDecade')}`;
}

/**
 * Compares two cases variable by variable.
 * `opposite` is true only if the signs differ AND both places have evidence of change.
 */
export function compareRows(modelA, modelB) {
  const evid = (v) => v === 'yes' || v === 'maybe';
  const main = new Set(CHAPTERS.filter((c) => c.open).flatMap((c) => c.codes));
  return modelA.rows.filter((r) => main.has(r.variable.code)).map((ra) => {
    const rb = modelB.rows.find((r) => r.variable.code === ra.variable.code);
    const a = { perDecade: ra.result.perDecade, verdict: ra.result.verdict };
    const b = { perDecade: rb.result.perDecade, verdict: rb.result.verdict };
    const both = evid(a.verdict) && evid(b.verdict);
    const sa = Math.sign(a.perDecade), sb = Math.sign(b.perDecade);
    return { variable: ra.variable, a, b, both, opposite: both && sa * sb < 0, same: both && sa * sb > 0 };
  });
}

// --- HTML ---
function stripesHtml(row, lang) {
  const colors = stripeColors(row.annual, row.variable.palette);
  const r = row.result, label = `${row.variable.name[lang]}: ${t(lang, verdictKey(r))}`;
  const bars = colors.map((c, i) => `<i style="background:${c}" title="${row.years[i]}"></i>`).join('');
  const first = row.years[0] ?? '', last = row.years.at(-1) ?? '';
  return `<div class="stripes" role="img" aria-label="${esc(label)}, ${first}–${last}">${bars}</div><div class="stripe-axis"><span>${first}</span><span>${last}</span></div>`;
}

function chartSvg(row, lang) {
  const pts = row.years.map((y, i) => [y, row.annual[i]]).filter(([, v]) => isNum(v));
  if (pts.length < 2) return '';
  const W = 600, H = 200, L = 46, R = 10, Tp = 10, B = 24;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R), Y = (y) => Tp + (1 - (y - y0) / (y1 - y0)) * (H - Tp - B);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join('');
  // Trend line: the same Sen slope shown as the rate.
  const r = row.result, clampY = (y) => Math.max(y0, Math.min(y1, y));
  const trend = r.mk ? `<line x1="${X(x0)}" y1="${Y(clampY(r.intercept + r.sen * x0))}" x2="${X(x1)}" y2="${Y(clampY(r.intercept + r.sen * x1))}" class="trend"/>` : '';
  const d = row.variable.decimals > 2 ? 2 : 1;
  const num = (v) => formatNum(v, d, lang);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${x0}–${x1}"><line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" class="axis"/>
<text x="${L - 6}" y="${Y(y1) + 4}" text-anchor="end">${num(y1)}</text><text x="${L - 6}" y="${Y(y0) + 4}" text-anchor="end">${num(y0)}</text>
<text x="${L}" y="${H - 6}">${x0}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${x1}</text>
<path d="${line}" class="series"/>${trend}</svg>`;
}

function birthHtml(row, lang) {
  const b = row.birth;
  if (!b) return '';
  const unit = unitOf(row.variable, lang);
  let body;
  if (b.status === 'ok') {
    const diff = `<strong>${formatNum(b.diff, row.variable.decimals, lang, true)} ${esc(unit)}</strong>`;
    body = t(lang, 'birth.since', { from: b.fromYear, fromEnd: b.fromYear + 9, to0: b.toYear - 9, to: b.toYear, diff });
    if (b.clamped) body += ` <span class="note">${t(lang, 'birth.clamped', { year: b.fromYear })}</span>`;
  } else if (b.status === 'tooRecent') body = t(lang, 'birth.tooRecent', { year: b.fromYear });
  else body = t(lang, 'birth.insufficient');
  return `<p class="birth"><span class="birth-tag">${t(lang, 'birth.title')}</span> ${body}</p>`;
}

/** A full variable: stripes, rate, verdict and folded detail. */
function rowHtml(row, lang, featured = false) {
  const v = row.variable, r = row.result, unit = unitOf(v, lang);
  const rate = r.verdict === 'insufficient'
    ? `<p class="rate muted">${t(lang, 'case.noRate')}</p>`
    : `<p class="rate"><strong>${esc(formatRate(r.perDecade, unit, v.decimals, lang))}</strong> <span class="muted">(${t(lang, 'case.range', { lo: formatNum(r.ci.lo * 10, v.decimals, lang, true), hi: formatNum(r.ci.hi * 10, v.decimals, lang, true) })})</span></p>`;
  return `<article class="row${featured ? ' featured' : ''}">
  <header><h4>${esc(v.name[lang])}</h4><span class="verdict" style="--vc:${VERDICT_COLOR[r.verdict]}" title="${esc(t(lang, `verdict.${r.verdict}.help`))}">${t(lang, verdictKey(r))}</span></header>
  ${stripesHtml(row, lang)}
  ${rate}
  <p class="help muted">${t(lang, `verdict.${r.verdict}.help`)}</p>
  ${v.caveat ? `<p class="caveat">${esc(v.caveat[lang])}</p>` : ''}
  ${birthHtml(row, lang)}
  <details><summary>${t(lang, 'case.chart')}</summary>
    ${chartSvg(row, lang)}
    ${r.mk ? `<p class="muted small">${t(lang, 'case.trendLine')} ${t(lang, 'case.stats', { n: r.n, p: r.mk.p < 0.001 ? `< ${formatNum(0.001, 3, lang)}` : formatNum(r.mk.p, 3, lang), r1: formatNum(r.r1, 2, lang) })}</p>` : ''}
    <p><strong>${t(lang, 'case.what')}:</strong> ${esc(v.what[lang])}</p>
    <p><strong>${t(lang, 'case.why')}:</strong> ${esc(v.why[lang])}</p>
    <p class="muted">${t(lang, 'case.source', { source: esc(v.source) })}</p>
  </details>
</article>`;
}

/** The verdict pills in the chapter header, one per variable. */
function chipsHtml(rows, lang) {
  return `<ul class="chips-verdict">${rows.map((r) => `<li class="verdict small" style="--vc:${VERDICT_COLOR[r.result.verdict]}">${esc(r.variable.short[lang])}: ${t(lang, verdictKey(r.result))}</li>`).join('')}</ul>`;
}

/**
 * The advice that follows the result. It changes with the verdict and its direction:
 * the advice is not the same where water increases as where it is scarce, nor where
 * there is no evidence of change. Short text and one icon each, to read at a glance.
 */
function adviceHtml(chapter, group, lang) {
  if (!chapter.actions) return '';
  const key = group.evidence && group.direction ? group.direction : 'none';
  const list = chapter.actions[key] || chapter.actions.none || [];
  if (!list.length) return '';
  return `<section class="advice">
  <h4>${t(lang, 'case.means')}</h4>
  <ul class="actions">${list.map((a) => `<li><span class="act-icon" aria-hidden="true">${a.icon}</span>${esc(a[lang])}</li>`).join('')}</ul>
  ${chapter.forWho ? `<p class="for-who"><b>${t(lang, 'case.forWho')}:</b> ${esc(chapter.forWho[lang])}</p>` : ''}
  ${chapter.context ? `<details class="why"><summary>${t(lang, 'case.whyWorld')}</summary>
    <p class="context"><b>${t(lang, 'case.context')}</b> ${esc(chapter.context[lang])}</p></details>` : ''}
</section>`;
}

/** A full chapter. Secondary chapters arrive folded. */
function chapterHtml(group, lang) {
  const { chapter, rows, featured, state } = group;
  if (!rows.length) return '';
  const others = rows.filter((r) => r !== featured);
  const head = `<header class="chapter-head"><h3><span class="chapter-icon" aria-hidden="true">${chapter.icon}</span> ${esc(chapter.name[lang])}</h3>
  <p class="chapter-q">${esc(chapter.question[lang])}</p>${chipsHtml(rows, lang)}</header>`;
  const body = `<div class="chapter-body">${featured ? rowHtml(featured, lang, true) : ''}
  ${others.length ? `<details class="more"><summary>${t(lang, 'case.more')}</summary>${others.map((r) => rowHtml(r, lang)).join('')}</details>` : ''}
  ${adviceHtml(chapter, group, lang)}</div>`;
  if (chapter.open) return `<section class="chapter" data-chapter="${chapter.id}" data-state="${state}">${head}${body}</section>`;
  return `<details class="chapter folded" data-chapter="${chapter.id}" data-state="${state}"><summary><span class="chapter-icon" aria-hidden="true">${chapter.icon}</span> ${esc(chapter.name[lang])} · <span class="muted">${esc(chapter.question[lang])}</span></summary>${body}</details>`;
}

/** Draws the full case file of a place inside `container`. */
export function renderCase(container, model, lang, { story = null } = {}) {
  const period = model.period.from ? t(lang, 'case.period', model.period) : '';
  container.innerHTML = `<section class="case">
  <header class="case-head"><h2>${esc(model.place.label)}</h2>
    <p class="muted small">${period} · NASA POWER</p>
    <p class="summary">${t(lang, model.summary, model.period)}</p>
    ${story ? `<p class="story">${esc(story)}</p>` : ''}</header>
  ${model.chapters.map((g) => chapterHtml(g, lang)).join('')}
  <details class="method"><summary>${t(lang, 'method.title')}</summary><p>${t(lang, 'method')}</p></details>
  <p class="muted small">${t(lang, 'source')}</p>
</section>`;
}

/** Draws the table that compares two places. */
export function renderCompare(container, modelA, modelB, lang) {
  const rows = compareRows(modelA, modelB);
  const cell = (row, x) => x.verdict === 'insufficient' ? `<td class="muted">—</td>`
    : `<td><strong>${esc(formatRate(x.perDecade, unitOf(row.variable, lang), row.variable.decimals, lang))}</strong><br><span class="verdict small" style="--vc:${VERDICT_COLOR[x.verdict]}">${t(lang, verdictKey(x))}</span></td>`;
  container.innerHTML = `<section class="compare"><h2>${t(lang, 'compare.title')}</h2>
<table><thead><tr><td></td><th scope="col">${esc(modelA.place.label)}</th><th scope="col">${esc(modelB.place.label)}</th><td></td></tr></thead><tbody>
${rows.map((r) => `<tr class="${r.opposite ? 'opposite' : ''}"><th scope="row">${esc(r.variable.name[lang])}</th>${cell(r, r.a)}${cell(r, r.b)}<td>${t(lang, r.opposite ? 'compare.opposite' : r.same ? 'compare.same' : 'compare.unclear')}</td></tr>`).join('')}
</tbody></table></section>`;
}

/** Shows an error message (key of the text catalogue). */
export function renderError(container, key, lang, vars = {}) {
  container.innerHTML = `<p class="error" role="alert">${esc(t(lang, key, vars))}</p>`;
}

/** Shows the loading notice. */
export function renderLoading(container, lang) {
  container.innerHTML = `<p class="loading" role="status">${t(lang, 'loading')}</p>`;
}

/**
 * Generates the image to share (1080×1350) by drawing the case file on a <canvas>.
 * @returns {Promise<Blob>} PNG image
 */
/** Rounded-corner rectangle, for the panels of the image. */
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Writes a text, splitting it into lines that fit the given width. */
function wrapText(g, text, x, y, maxW, lh) {
  let line = '';
  for (const word of String(text).split(' ')) {
    const probe = line ? `${line} ${word}` : word;
    if (g.measureText(probe).width > maxW && line) { g.fillText(line, x, y); y += lh; line = word; }
    else line = probe;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}

export async function caseToPng(model, lang, siteUrl = '') {
  const W = 1080, H = 1350, P = 56;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const INK = '#ffffff', SOFT = '#9fb0c0', MID = '#d7e0ea';
  const tone = { yes: '#ff8a80', maybe: '#ffcc66', none: SOFT, insufficient: SOFT };

  const panels = [];   // painted at the end, behind the content
  g.fillStyle = INK; g.font = '600 28px system-ui, sans-serif'; g.fillText('Earth Trend Detective', P, 64);
  g.font = '700 50px system-ui, sans-serif';
  let title = model.place.label.split(',').slice(0, 2).join(',');
  // The right-hand corner is left free for the team seal.
  while (g.measureText(title).width > W - 2 * P - 150 && title.length > 4) title = title.slice(0, -2) + '…';
  g.fillText(title, P, 128);
  g.fillStyle = SOFT; g.font = '24px system-ui, sans-serif';
  if (model.period.from) g.fillText(`${model.period.from}–${model.period.to} · NASA POWER`, P, 166);
  g.fillStyle = MID; g.font = '600 27px system-ui, sans-serif';
  let y = wrapText(g, t(lang, model.summary, model.period), P, 212, W - 2 * P, 34) + 16;

  for (const group of model.chapters) {
    const { chapter, featured } = group;
    if (!chapter.open || !featured) continue;
    const v = featured.variable, r = featured.result;
    const top = y;

    // Chapter colour bar, to the left of its panel.
    g.fillStyle = chapter.tint; g.fillRect(P - 24, y + 6, 6, 40);
    g.fillStyle = INK; g.font = '700 32px system-ui, sans-serif';
    g.fillText(`${chapter.icon} ${chapter.name[lang].toUpperCase()}`, P, y + 26);
    g.fillStyle = SOFT; g.font = '23px system-ui, sans-serif';
    g.fillText(chapter.question[lang], P, y + 56);
    y += 80;

    // The chapter's main variable, with its stripes.
    g.fillStyle = INK; g.font = '600 27px system-ui, sans-serif'; g.fillText(v.name[lang], P, y + 22);
    g.fillStyle = tone[r.verdict]; g.font = '600 24px system-ui, sans-serif';
    g.textAlign = 'right'; g.fillText(t(lang, verdictKey(r)), W - P, y + 22); g.textAlign = 'left';
    const colors = stripeColors(featured.annual, v.palette), bw = (W - 2 * P) / Math.max(1, colors.length);
    colors.forEach((col, i) => { g.fillStyle = col; g.fillRect(P + i * bw, y + 38, bw + 0.5, 46); });
    y += 96;
    if (r.verdict !== 'insufficient') {
      g.fillStyle = MID; g.font = '600 26px system-ui, sans-serif';
      const range = t(lang, 'case.range', { lo: formatNum(r.ci.lo * 10, v.decimals, lang, true), hi: formatNum(r.ci.hi * 10, v.decimals, lang, true) });
      g.fillText(`${formatRate(r.perDecade, unitOf(v, lang), v.decimals, lang)}  (${range})`, P, y + 20);
      y += 34;
    }

    const b = featured.birth;
    if (b && b.status === 'ok') {
      g.fillStyle = '#7dd3fc'; g.font = '600 23px system-ui, sans-serif';
      const tag = `${t(lang, 'birth.title')} (${b.fromYear}): `;
      g.fillText(tag, P, y + 20);
      g.fillStyle = INK; g.font = '700 25px system-ui, sans-serif';
      g.fillText(`${formatNum(b.diff, v.decimals, lang, true)} ${unitOf(v, lang)}`, P + g.measureText(tag).width + 6, y + 20);
      y += 38;
    }

    // The advice that follows that result, in two columns.
    const acts = chapter.actions ? (chapter.actions[group.evidence && group.direction ? group.direction : 'none'] || []) : [];
    if (acts.length) {
      g.fillStyle = '#7dd3fc'; g.font = '700 20px system-ui, sans-serif';
      g.fillText(t(lang, 'case.means').toUpperCase(), P, y + 24);
      y += 38;
      const colW = (W - 2 * P) / 2 - 10;
      let row = y;
      acts.forEach((a, i) => {
        const x = P + (i % 2) * (colW + 20);
        if (i % 2 === 0 && i) row += 62;
        g.fillStyle = 'rgba(148,163,184,0.12)';
        g.fillRect(x, row, colW, 54);
        g.font = '26px system-ui, sans-serif'; g.fillStyle = INK;
        g.fillText(a.icon, x + 14, row + 36);
        g.font = '22px system-ui, sans-serif'; g.fillStyle = MID;
        let s = a[lang];
        while (g.measureText(s).width > colW - 60 && s.length > 6) s = s.slice(0, -2) + '…';
        g.fillText(s, x + 54, row + 35);
      });
      y = row + 54 + 22;
    }
    panels.push({ top: top - 16, bottom: y, tint: chapter.tint });
    y += 34;
  }

  // The panels and the background go underneath everything already drawn.
  g.globalCompositeOperation = 'destination-over';
  for (const p of panels) {
    g.fillStyle = 'rgba(148,163,184,0.10)';
    roundRect(g, P - 32, p.top, W - 2 * (P - 32), p.bottom - p.top, 18); g.fill();
  }
  g.fillStyle = '#0f1720'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';

  // Team seal, top right, with its name below.
  const seal = await sealImage();
  const S = 92, sx = W - P - S;
  if (seal) g.drawImage(seal, sx, 28, S, S);
  g.fillStyle = '#9ff3e6'; g.font = '700 15px system-ui, sans-serif';
  g.textAlign = 'center';
  TEAM.lines.forEach((line, i) => g.fillText(line, sx + S / 2, 28 + S + 20 + i * 18));
  g.textAlign = 'left';

  g.fillStyle = MID; g.font = '600 22px system-ui, sans-serif';
  g.fillText(t(lang, 'disclaimer'), P, H - 104);
  g.fillStyle = SOFT; g.font = '19px system-ui, sans-serif';
  wrapText(g, `${t(lang, 'source')}${siteUrl ? ` · ${siteUrl}` : ''}`, P, H - 72, W - 2 * P, 26);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
