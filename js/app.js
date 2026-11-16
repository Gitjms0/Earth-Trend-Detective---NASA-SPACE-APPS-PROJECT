/**
 * app.js — Entry point: connects the page with the modules.
 *
 * Flow of a search:
 *   1. geo.js    turns the text (or a point on the globe) into coordinates.
 *   2. power.js  requests that point's data from NASA POWER and turns it into annual series.
 *   3. model.js  applies the statistics (stats.js, heat.js) and "since you were born" (birth.js).
 *   4. ui.js     draws the case file.
 * The example cases follow the same path, but read data saved in data/demos/.
 *
 * The place is picked on a 3D globe (globe.js) or on the flat map, which deliver the same
 * thing: a latitude and a longitude. If the globe cannot load, the flat map remains.
 */

import { fetchPower, parseAll } from './power.js';
import { t } from './catalog.js';
import { buildCase, hasData } from './model.js';
import { searchPlace, suggestPlaces, nameOfPoint, labelOf } from './geo.js';
import { createGlobe } from './globe.js';
import { SEAL_URI } from './brand.js';
import { renderCase, renderCompare, renderError, renderLoading, caseToPng } from './ui.js';

const $ = (id) => document.getElementById(id);
const state = {
  lang: 'en', demos: [], main: null, other: null, // opens in English; the button switches to Spanish
  globe: null, map: null, marker: null, view: 'globe',
  loading: false, error: null, errorVars: {},
};

function applyTexts() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(state.lang, el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(state.lang, el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(state.lang, el.dataset.i18nAria)); });
  $('lang').textContent = t(state.lang, 'lang.switch');
  $('view-toggle').textContent = t(state.lang, state.view === 'globe' ? 'geo.flat' : 'geo.globe');
  $('map-hint').textContent = t(state.lang, state.view === 'globe' ? 'search.globe' : 'search.map');
  renderDemoButtons();
}

function renderDemoButtons() {
  for (const [boxId, slot] of [['demo-buttons', 'main'], ['compare-demos', 'other']]) {
    const box = $(boxId); box.innerHTML = '';
    for (const d of state.demos) {
      const b = document.createElement('button'); b.type = 'button';
      b.textContent = labelOf(d.place, state.lang);
      const s = document.createElement('span'); s.textContent = d.kind[state.lang]; b.appendChild(s);
      b.addEventListener('click', () => loadDemo(d.id, slot));
      box.appendChild(b);
    }
  }
}

const MAX_BIRTH = new Date().getFullYear();
/** Year of birth typed by the user; null if empty or out of range. */
const birthYear = () => {
  const raw = $('birth').value.trim(), v = Number(raw);
  return raw && Number.isInteger(v) && v >= 1900 && v <= MAX_BIRTH ? v : null;
};
const birthInvalid = () => $('birth').value.trim() !== '' && birthYear() === null;

/** Redraws everything from the current state. */
function draw() {
  if (state.loading) renderLoading($('status'), state.lang);
  else if (state.error) renderError($('status'), state.error, state.lang, state.errorVars);
  else $('status').innerHTML = '';
  if (state.main) {
    renderCase($('case'), state.main.model, state.lang, { story: state.main.story?.[state.lang] });
    $('tools').hidden = false;
  }
  if (state.main && state.other) renderCompare($('compare'), state.main.model, state.other.model, state.lang);
  else $('compare').innerHTML = '';
}
function fail(key, vars) { state.loading = false; state.error = key; state.errorVars = vars; draw(); }

/** Rebuilds a slot's model with the current language and year of birth. */
function rebuild(slot) {
  const s = state[slot];
  if (!s) return;
  s.model = buildCase(s.parsed, { ...s.place, label: labelOf(s.place, state.lang) }, birthYear());
}

function setSlot(slot, parsed, place, story = null) {
  let model;
  // If the calculation or the drawing fails, the user is told: the page never stays loading forever.
  try { model = buildCase(parsed, { ...place, label: labelOf(place, state.lang) }, birthYear()); }
  catch (e) { console.error(e); fail('error.api'); return; }
  if (!hasData(model)) { fail('error.noData'); return; }
  state[slot] = { parsed, place, story, model };
  state.loading = false;
  state.error = birthInvalid() ? 'error.birth' : null; state.errorVars = { max: MAX_BIRTH };
  if (slot === 'main') { state.other = null; seq.other++; markPlace(place); }
  try { draw(); } catch (e) { console.error(e); fail('error.api'); return; }
  if (slot === 'other') $('compare').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Each search gets a number. If, when the response arrives, another search has already
// been launched for the same slot, the old response is discarded (so it cannot overwrite the new one).
const seq = { main: 0, other: 0 };

async function loadPlace(place, slot = 'main', id = ++seq[slot]) {
  state.loading = true; state.error = null; draw();
  let json;
  try { json = await fetchPower(place.lat, place.lon); }
  catch (e) { if (id === seq[slot]) { console.error(e); fail('error.api'); } return; }
  if (id !== seq[slot]) return;
  setSlot(slot, parseAll(json), place);
  // A tapped point arrives without a name: it gets one later, without making anyone wait.
  if (!place.geo) nameLater(place, slot, id);
}

/** Requests the point's name and, if it arrives in time, puts it in the case file. */
async function nameLater(place, slot, id) {
  const lang = state.lang;
  const name = await nameOfPoint(place.lat, place.lon, lang);
  if (!name || id !== seq[slot] || lang !== state.lang || !state[slot]) return;
  state[slot].place = { ...place, label: name, geo: true };
  rebuild(slot);
  draw();
}

function loadDemo(id, slot = 'main') {
  const d = state.demos.find((x) => x.id === id);
  if (!d) return;
  seq[slot]++; // cancels any search in progress for this slot
  setSlot(slot, d.parsed, d.place, d.story);
}

/**
 * Suggestions while typing. It waits until the user stops typing
 * (300 ms) and cancels the previous query, so as not to flood the service.
 */
const suggestions = new Map(); // label → { lat, lon, label }
function wireSuggest(inputId, listId) {
  let timer = null, ctrl = null;
  $(inputId).addEventListener('input', () => {
    clearTimeout(timer);
    if (ctrl) ctrl.abort();
    const q = $(inputId).value;
    timer = setTimeout(async () => {
      ctrl = new AbortController();
      const found = await suggestPlaces(q, state.lang, { signal: ctrl.signal });
      const list = $(listId);
      list.innerHTML = '';
      for (const s of found) {
        suggestions.set(s.label, { ...s, geo: true });
        const opt = document.createElement('option'); opt.value = s.label; list.appendChild(opt);
      }
    }, 300);
  });
}

async function onSearch(inputId, slot) {
  const q = $(inputId).value;
  // The number is taken before any early return: that way an empty submit also cancels
  // the previous search, and its late response cannot overwrite the error message.
  const id = ++seq[slot];
  if (!q.trim()) { fail('error.notFound'); return; }
  state.loading = true; state.error = null; draw();
  // If a suggestion was picked we already have its coordinates: no need to search again.
  const picked = suggestions.get(q.trim());
  if (picked) { await loadPlace(picked, slot, id); return; }
  let place = null;
  try { place = await searchPlace(q, state.lang); }
  catch (e) { if (id === seq[slot]) { console.error(e); fail('error.search'); } return; }
  if (id !== seq[slot]) return;
  if (!place) { fail('error.notFound'); return; }
  await loadPlace({ ...place, geo: true }, slot, id);
}

/* ---------- Picking the place: 3D globe or flat map ---------- */

/** A tap on the globe or the map: same coordinates, same path. */
function pick(lat, lon, place) {
  const la = +lat.toFixed(2), lo = +(((lon + 540) % 360) - 180).toFixed(2);
  loadPlace(place || { lat: la, lon: lo, label: `${la}, ${lo}` });
}

function initGlobe() {
  state.globe = createGlobe($('globe'), {
    places: state.demos.map((d) => ({ ...d.place, label: labelOf(d.place, state.lang) })),
    onPick: (lat, lon, p) => (p ? loadDemoByPlace(p) : pick(lat, lon)),
  });
  if (!state.globe) { setView('map'); $('view-toggle').hidden = true; return; }
  addEventListener('resize', () => state.globe.resize());
}

/** Tapping a globe marker opens that example case. */
function loadDemoByPlace(p) {
  const d = state.demos.find((x) => x.place.lat === p.lat && x.place.lon === p.lon);
  if (d) loadDemo(d.id); else pick(p.lat, p.lon);
}

function initMap() {
  if (!window.L || state.map) return;
  state.map = L.map('map', { worldCopyJump: true }).setView([-10, -60], 2);
  // Map built only from NASA layers (GIBS service): no API key required.
  const gibs = (layer, matrix, ext) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${matrix}/{z}/{y}/{x}.${ext}`;
  L.tileLayer(gibs('BlueMarble_ShadedRelief_Bathymetry', 'GoogleMapsCompatible_Level8', 'jpeg'), { maxNativeZoom: 8, maxZoom: 10, attribution: 'NASA GIBS' }).addTo(state.map);
  L.tileLayer(gibs('Reference_Features', 'GoogleMapsCompatible_Level9', 'png'), { maxNativeZoom: 9, maxZoom: 10 }).addTo(state.map);
  L.tileLayer(gibs('Reference_Labels', 'GoogleMapsCompatible_Level9', 'png'), { maxNativeZoom: 9, maxZoom: 10 }).addTo(state.map);
  state.map.on('click', (e) => pick(e.latlng.lat, e.latlng.lng));
}

/** Switches between the globe and the flat map. The map is created the first time it is needed. */
function setView(view) {
  state.view = view;
  const onGlobe = view === 'globe';
  $('globe').hidden = !onGlobe;
  $('map').hidden = onGlobe;
  $('globe-zoom').hidden = !onGlobe;
  if (!onGlobe) { initMap(); if (state.map) setTimeout(() => state.map.invalidateSize(), 50); }
  else if (state.globe) state.globe.resize();
  if (state.main) markPlace(state.main.place);
  applyTexts();
}

/** Marks the picked place on the active view. */
function markPlace(place) {
  if (state.globe) { state.globe.setPicked(place.lat, place.lon); }
  if (state.map) {
    if (state.marker) state.marker.remove();
    state.marker = L.marker([place.lat, place.lon]).addTo(state.map);
    state.map.setView([place.lat, place.lon], Math.max(state.map.getZoom(), 5));
  }
}

/* ---------- Language switch ---------- */

let langSeq = 0;
/**
 * Place names that came from the search are requested again in the new language,
 * so that the whole case file is in a single language. If the service fails, the
 * existing name is kept.
 */
async function switchLang() {
  state.lang = state.lang === 'es' ? 'en' : 'es';
  const mine = ++langSeq, lang = state.lang;
  for (const slot of ['main', 'other']) if (state[slot]) rebuild(slot);
  applyTexts();
  if (state.globe) state.globe.setMarks(state.demos.map((d) => ({ ...d.place, label: labelOf(d.place, lang) })));
  draw();

  for (const slot of ['main', 'other']) {
    const s = state[slot];
    if (!s?.place.geo) continue;
    const name = await nameOfPoint(s.place.lat, s.place.lon, lang);
    if (!name || mine !== langSeq || !state[slot]) continue;
    state[slot].place = { ...state[slot].place, label: name };
    rebuild(slot);
  }
  if (mine === langSeq) draw();
}

async function init() {
  $('brand-seal').src = SEAL_URI; // team seal in the header
  $('search').addEventListener('submit', (e) => { e.preventDefault(); onSearch('q', 'main'); });
  $('compare-form').addEventListener('submit', (e) => { e.preventDefault(); onSearch('q2', 'other'); });
  $('birth').addEventListener('change', () => {
    for (const slot of ['main', 'other']) rebuild(slot);
    state.error = birthInvalid() ? 'error.birth' : null; state.errorVars = { max: MAX_BIRTH };
    draw();
  });
  $('lang').addEventListener('click', switchLang);
  $('view-toggle').addEventListener('click', () => setView(state.view === 'globe' ? 'map' : 'globe'));
  $('zoom-in').addEventListener('click', () => state.globe && state.globe.zoom(0.75));
  $('zoom-out').addEventListener('click', () => state.globe && state.globe.zoom(1.35));
  $('download').addEventListener('click', async () => {
    if (!state.main) return;
    const site = location.protocol === 'http:' || location.protocol === 'https:' ? location.host + location.pathname : '';
    const blob = await caseToPng(state.main.model, state.lang, site);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'earth-trend-detective.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  wireSuggest('q', 'places');
  wireSuggest('q2', 'places2');
  applyTexts();

  try {
    if (window.__DEMOS__) state.demos = window.__DEMOS__; // single-file version
    else {
      const idx = await (await fetch('data/demos/index.json')).json();
      state.demos = await Promise.all(idx.map(async (d) => ({ ...d, ...(await (await fetch(`data/demos/${d.file}`)).json()) })));
    }
    renderDemoButtons();
  } catch { /* no example cases: live search keeps working */ }

  initGlobe();
}
init();
