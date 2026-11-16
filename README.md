# Earth Trend Detective

**Is your place becoming harder to live in?**
Rising heat and missing water, measured with 45 years of NASA data.

### [▶ Try the demo](https://gitjms0.github.io/Earth-Trend-Detective---NASA-SPACE-APPS-PROJECT/)

A project by **Pachamama Data Lab** for the NASA Space Apps Challenge 2026, challenge *Be an Earth System Trend Detective*.

---

## What it does

Type a place (or tap it on the globe) and the tool answers two questions with NASA POWER data from 1981 to 2025:

- **Heat:** is it hotter or cooler than before? (felt heat, maximum and average temperature)
- **Water:** is there more or less water than before? (rainfall and soil moisture)

For each variable it shows year-by-year colour stripes, the rate of change per decade with its confidence range, a plain-language verdict, and what to do about it depending on the result. Optionally it compares the climate since the year you were born, compares two places side by side, and generates an image of the case file to share.

The interface is available in English and Spanish.

## Who it is for

People who need local evidence to decide or justify something: municipalities and civil protection, companies with outdoor staff, farmers and cooperatives, health services and schools, and local organisations applying for adaptation funding.

## How it works

1. **Data:** the public [NASA POWER](https://power.larc.nasa.gov) API (MERRA-2 reanalysis and SRB/CERES radiation), monthly values averaged per year. No registration or API key required.
2. **Trend:** Mann-Kendall test, corrected for autocorrelation between consecutive years.
3. **Rate of change:** Sen slope with a 95% confidence interval.
4. **Felt heat:** NOAA heat index formula applied to monthly maximum temperature and humidity.
5. **Verdict:** p < 0.05 → change; p < 0.20 → possible change; otherwise → no evidence. The summary only states that a chapter changed when its main variable confirms it or when at least two of its variables agree.

**Limits:** each point represents an area about 50 km wide; the data come from a reanalysis, not a local weather station; rainfall and soil moisture show a jump around 2015 that may come from how the data are produced. The tool measures what already happened: **it is not a forecast**.

## Code structure

```
├── index.html            Page structure
├── css/style.css         Styles (mobile-first)
├── js/
│   ├── app.js            Entry point: connects the page with the modules
│   ├── power.js          Download and parsing of NASA POWER data
│   ├── catalog.js        Variables, chapters and interface texts (English / Spanish)
│   ├── stats.js          Mann-Kendall, Sen slope, regression, verdict
│   ├── heat.js           Heat index (NOAA)
│   ├── birth.js          "Since you were born"
│   ├── model.js          Joins data and statistics into the case for a place
│   ├── geo.js            Place search (OpenStreetMap)
│   ├── globe.js          3D globe
│   ├── brand.js          Team seal
│   └── ui.js             Drawing of the case file, comparison and image
├── data/demos/           Example cases (Lima, Ica, La Oroya) with pre-downloaded data
├── dist/                 Single-file version, opens without a server
└── tools/                Script that builds the single-file version
```

The calculation modules (`stats.js`, `heat.js`, `birth.js`, `model.js`) are pure: they do not touch the page and can be used from Node.

## Run it on your computer

JavaScript modules need a web server; opening `index.html` by double-clicking does not work. From the project folder:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000`. To just look at it without installing anything, open `dist/earth-trend-detective.html` directly.

To rebuild the single-file version after changing the code:

```bash
python3 tools/build_single_file.py
```

## Sources and credits

- Climate data: NASA POWER (MERRA-2, SRB/CERES).
- Flat map: NASA GIBS layers. Globe: NASA Blue Marble texture, with [Globe.gl](https://globe.gl).
- Place search: [Photon](https://photon.komoot.io) and [Nominatim](https://nominatim.org), © OpenStreetMap contributors.
- Map library: [Leaflet](https://leafletjs.com).
- Context in the chapters: ILO (2024), Imperial College and LSHTM (2025), Mekonnen and Hoekstra (2016) via UN-Water.
