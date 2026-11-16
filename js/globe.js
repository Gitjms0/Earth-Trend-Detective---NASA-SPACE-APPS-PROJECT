/**
 * globe.js — The 3D globe used to pick a place.
 *
 * Uses Globe.gl (on top of three.js) with NASA's Blue Marble texture. A tap on any
 * point returns its latitude and longitude, just like the flat map: for the rest of
 * the app the two are interchangeable.
 *
 * If the library failed to load (no internet, or blocked), `createGlobe` returns
 * null and the caller falls back to the flat map. Never throws.
 */

const TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const MARK = '#fbbf24';   // the example places
const PICK = '#60a5fa';   // the point the user picked

/**
 * @param {HTMLElement} el container; it sizes itself to the available width
 * @param {{places?: object[], onPick?: (lat:number, lon:number, place?:object) => void, height?: number}} opts
 *   places: places to mark, each { lat, lon, label }
 *   onPick: called with the picked coordinates; if a marker was tapped, also with it
 * @returns {{setMarks:Function, setPicked:Function, focus:Function, resize:Function, stopSpin:Function}|null}
 */
export function createGlobe(el, { places = [], onPick = () => {}, height = 360 } = {}) {
  if (typeof window === 'undefined' || !window.Globe || !el) return null;
  let marks = places.map((p) => ({ lat: p.lat, lng: p.lon, place: p }));
  let picked = null;

  const all = () => (picked ? marks.concat([picked]) : marks);
  const g = window.Globe()(el)
    .globeImageUrl(TEXTURE)
    .backgroundColor('rgba(0,0,0,0)')
    .pointColor((d) => (d.sel ? PICK : MARK))
    .pointAltitude((d) => (d.sel ? 0.08 : 0.035))
    .pointRadius((d) => (d.sel ? 0.7 : 0.45))
    .pointsData(all())
    .ringColor(() => (t) => `rgba(251,191,36,${1 - t})`)
    .ringMaxRadius(5).ringPropagationSpeed(1.6).ringRepeatPeriod(1400)
    .ringsData(marks)
    .onPointClick((d) => onPick(d.lat, d.lng, d.place))
    .onGlobeClick((c) => onPick(c.lat, c.lng));

  const c = g.controls();
  c.autoRotate = true; c.autoRotateSpeed = 0.45;
  c.enableZoom = true; c.minDistance = 130; c.maxDistance = 420;

  const api = {
    /** Changes the marked places (for example when switching language). */
    setMarks(list) { marks = list.map((p) => ({ lat: p.lat, lng: p.lon, place: p })); g.ringsData(marks).pointsData(all()); },
    /** Marks the picked point and stops the spin. */
    setPicked(lat, lon) { picked = { lat, lng: lon, sel: true }; c.autoRotate = false; g.pointsData(all()); },
    /** Moves the view to a point. */
    focus(lat, lon, altitude = 1.1) { c.autoRotate = false; g.pointOfView({ lat, lng: lon, altitude }, 600); },
    stopSpin() { c.autoRotate = false; },
    /** Zooms in or out; f < 1 zooms in. */
    zoom(f) { const p = g.pointOfView(); g.pointOfView({ ...p, altitude: Math.max(0.35, Math.min(2.6, p.altitude * f)) }, 400); },
    /* The height is set by the CSS (#globe uses clamp), so it is read from the
       container; `height` is only a fallback if the CSS does not define it. */
    resize() { g.width(el.clientWidth).height(el.clientHeight || height); },
  };
  api.resize();
  g.pointOfView({ lat: -10, lng: -70, altitude: 2.1 });
  return api;
}
