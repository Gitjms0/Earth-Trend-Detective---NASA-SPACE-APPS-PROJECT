/**
 * catalog.js — What the tool measures and how it speaks to the user.
 *
 * Three pieces:
 *   VARIABLES — each indicator, with its plain definition and unit.
 *   CHAPTERS  — the two chapters (heat and water) plus the extra indicators. Each chapter
 *               carries its question, the figure that explains why it matters, and what
 *               each kind of user can do with the answer.
 *   T / t     — every interface text, in Spanish and English.
 *
 * To add a variable: its code in power.js, an entry here and its chapter.
 * To add a language: one more block in T with the same keys.
 */

export const VARIABLES = [
  {
    code: 'HEATIDX', derived: true, unit: '°C', decimals: 2, palette: 'heat', source: 'MERRA-2 + NOAA',
    name: { es: 'Calor sentido', en: 'Felt heat' },
    short: { es: 'Calor sentido', en: 'Felt heat' },
    what: {
      es: 'Lo que el cuerpo siente: combina la temperatura máxima con la humedad del aire. Con humedad alta el sudor no evapora y el mismo calor hace más daño.',
      en: 'What the body feels: it combines maximum temperature with air humidity. When humidity is high, sweat does not evaporate and the same heat does more harm.',
    },
    why: {
      es: 'Es el número que usan los servicios meteorológicos para avisar cuándo el calor empieza a ser peligroso para la salud.',
      en: 'It is the number weather services use to warn when heat starts to endanger health.',
    },
    caveat: {
      es: 'Fórmula del NOAA sobre valores mensuales: mide cómo cambia el calor típico, no una tarde concreta. Tiende a quedar alto, porque junta la máxima del día con la humedad promedio de las 24 horas, y la humedad baja justo cuando aprieta el calor. En los meses fríos la fórmula se acerca a la temperatura del aire. Compara su tendencia con la de la temperatura máxima, aquí abajo.',
      en: 'NOAA formula on monthly values: it measures how typical heat changes, not one specific afternoon. It tends to run high, because it pairs the day\'s maximum with the 24-hour average humidity, and humidity drops just when heat peaks. In cold months the formula comes close to air temperature. Compare its trend with that of maximum temperature, below.',
    },
  },
  {
    code: 'T2M_MAX', unit: '°C', decimals: 2, palette: 'heat', source: 'MERRA-2',
    name: { es: 'Temperatura máxima', en: 'Maximum temperature' },
    short: { es: 'Máxima', en: 'Maximum' },
    what: { es: 'Promedio de la temperatura más alta de cada mes.', en: 'Average of the highest temperature reached each month.' },
    why: { es: 'Marca los días en que el trabajo al aire libre y la salud de los más frágiles se complican.', en: 'It marks the days when outdoor work and the health of the most fragile get harder.' },
  },
  {
    code: 'T2M', unit: '°C', decimals: 2, palette: 'heat', source: 'MERRA-2',
    name: { es: 'Temperatura media', en: 'Average temperature' },
    short: { es: 'Media', en: 'Average' },
    what: { es: 'Qué tan caliente está el aire a 2 metros del suelo, en promedio de todo el año.', en: 'How warm the air is 2 meters above the ground, averaged over the whole year.' },
    why: { es: 'Es el indicador base del calentamiento y el que mejor se compara con otras fuentes.', en: 'It is the baseline indicator of warming and the easiest to compare with other sources.' },
  },
  {
    code: 'PRECTOTCORR', unit: 'mm/día', unitEn: 'mm/day', decimals: 2, palette: 'water', source: 'MERRA-2',
    name: { es: 'Lluvia', en: 'Rainfall' },
    short: { es: 'Lluvia', en: 'Rainfall' },
    what: { es: 'Cuánta lluvia cae por día, en promedio del año.', en: 'How much rain falls per day, averaged over the year.' },
    why: { es: 'De ella dependen los embalses, los pozos y los cultivos de secano.', en: 'Reservoirs, wells and rain-fed crops depend on it.' },
    caveat: {
      es: 'Ojo: en los datos de NASA POWER esta variable da un salto hacia 2015 en lugares muy distintos a la vez. Puede deberse a un cambio en cómo se generan los datos y no solo al clima; conviene contrastarla con estaciones locales.',
      en: 'Caution: in NASA POWER data this variable jumps around 2015 in very different places at once. It may reflect a change in how the data are produced, not only the climate; check it against local stations.',
    },
  },
  {
    code: 'GWETROOT', unit: '(0–1)', decimals: 3, palette: 'water', source: 'MERRA-2',
    name: { es: 'Humedad del suelo', en: 'Soil moisture' },
    short: { es: 'Suelo', en: 'Soil' },
    what: { es: 'Qué tan húmeda está la tierra donde crecen las raíces: 0 es seca, 1 es saturada.', en: 'How wet the soil is where roots grow: 0 is dry, 1 is saturated.' },
    why: { es: 'Es el agua que de verdad llega a los cultivos, después de la evaporación.', en: 'It is the water that actually reaches crops, after evaporation.' },
    caveat: {
      es: 'Es humedad modelada, no medida en campo, y comparte el salto hacia 2015 de la lluvia. Úsala como indicio, no como prueba.',
      en: 'This is modelled moisture, not measured in the field, and it shares the 2015 jump seen in rainfall. Use it as a hint, not as proof.',
    },
  },
  {
    code: 'RH2M', unit: '%', decimals: 1, palette: 'water', source: 'MERRA-2',
    name: { es: 'Humedad del aire', en: 'Air humidity' },
    short: { es: 'Humedad del aire', en: 'Air humidity' },
    what: { es: 'Cuánto vapor de agua tiene el aire respecto del máximo que puede contener.', en: 'How much water vapor the air holds compared with the most it could hold.' },
    why: { es: 'Entra en el cálculo del calor sentido y afecta la niebla, el riego y la corrosión.', en: 'It feeds the felt-heat calculation and affects fog, irrigation and corrosion.' },
  },
  {
    code: 'ALLSKY_SFC_SW_DWN', unit: 'MJ/m²/día', unitEn: 'MJ/m²/day', decimals: 2, palette: 'sun', source: 'SRB / CERES',
    name: { es: 'Energía solar', en: 'Solar energy' },
    short: { es: 'Energía solar', en: 'Solar energy' },
    what: { es: 'Cuánta energía del sol llega al suelo cada día, contando las nubes.', en: 'How much energy from the sun reaches the ground each day, clouds included.' },
    why: { es: 'Define cuánto rinde un panel solar y refleja cambios en la nubosidad.', en: 'It sets how much a solar panel produces and reflects changes in cloud cover.' },
  },
];

export const VAR_BY_CODE = Object.fromEntries(VARIABLES.map((v) => [v.code, v]));

/**
 * The chapters of the case file. Their order is the order in which they are shown.
 * `open` decides whether the chapter arrives expanded; `featured` is the variable shown
 * in full, the other variables of the chapter stay folded below it.
 */
export const CHAPTERS = [
  {
    id: 'heat', icon: '🔥', tint: '#b91c1c', open: true, featured: 'HEATIDX', codes: ['HEATIDX', 'T2M_MAX', 'T2M'],
    name: { es: 'Calor', en: 'Heat' },
    question: { es: '¿Hace más o menos calor que antes?', en: 'Hotter or cooler than before?' },
    context: {
      es: '2.410 millones de trabajadores están expuestos a calor excesivo y se le atribuyen unas 19.000 muertes laborales al año (OIT, 2024). En el verano de 2025, Europa vivió olas de calor con miles de muertes atribuidas (Imperial College y LSHTM, 2025).',
      en: '2.41 billion workers are exposed to excessive heat, with some 19,000 work-related deaths a year attributed to it (ILO, 2024). In the summer of 2025, Europe saw heat waves with thousands of attributed deaths (Imperial College and LSHTM, 2025).',
    },
    actions: {
      up: [
        { icon: '🕐', es: 'Trabajo pesado al amanecer', en: 'Heavy work at dawn' },
        { icon: '🥤', es: 'Agua y pausas a la sombra', en: 'Water and breaks in the shade' },
        { icon: '🌳', es: 'Más sombra en calles y paraderos', en: 'More shade on streets and stops' },
        { icon: '📣', es: 'Avisar a quien vive solo', en: 'Warn those who live alone' },
      ],
      down: [
        { icon: '👀', es: 'El calor cede: seguir midiendo', en: 'Heat is easing: keep measuring' },
      ],
      none: [
        { icon: '👍', es: 'Nada que cambiar por ahora', en: 'Nothing to change for now' },
        { icon: '📅', es: 'Volver a mirar en unos años', en: 'Check back in a few years' },
      ],
    },
    forWho: { es: 'Municipios · obra y transporte · salud y colegios', en: 'Municipalities · construction and transport · health and schools' },
    means: [
      {
        who: { es: 'Municipio o defensa civil', en: 'Municipality or civil protection' },
        line: { es: 'Sustentar un plan de calor: sombra en plazas y paraderos, horarios escolares, aviso a adultos mayores.', en: 'Back a heat plan: shade in squares and bus stops, school hours, warnings for older people.' },
      },
      {
        who: { es: 'Empresa con personal al aire libre', en: 'Company with outdoor staff' },
        line: { es: 'Mover cuadrillas a horas frescas, fijar pausas e hidratación, y sustentar la medida ante el comité de seguridad.', en: 'Move crews to cooler hours, set breaks and hydration, and justify it to the safety committee.' },
      },
      {
        who: { es: 'Salud y colegios', en: 'Health services and schools' },
        line: { es: 'Ajustar campañas y calendario al calor que hoy es normal, no al de hace treinta años.', en: 'Align campaigns and calendars with the heat that is normal today, not that of thirty years ago.' },
      },
    ],
  },
  {
    id: 'water', icon: '💧', tint: '#0e7490', open: true, featured: 'PRECTOTCORR', codes: ['PRECTOTCORR', 'GWETROOT'],
    name: { es: 'Agua', en: 'Water' },
    question: { es: '¿Hay más o menos agua que antes?', en: 'More or less water than before?' },
    context: {
      es: 'Cerca de 4.000 millones de personas sufren escasez severa de agua al menos un mes al año (Mekonnen y Hoekstra, 2016, recogido por UN-Water). Bogotá estuvo un año en racionamiento, de abril de 2024 a abril de 2025.',
      en: 'About 4 billion people face severe water scarcity at least one month a year (Mekonnen and Hoekstra, 2016, cited by UN-Water). Bogotá was under rationing for a year, from April 2024 to April 2025.',
    },
    actions: {
      up: [
        { icon: '🌊', es: 'Revisar drenajes y cauces', en: 'Check drains and channels' },
        { icon: '🛣️', es: 'Cunetas y taludes en rutas', en: 'Ditches and slopes on roads' },
        { icon: '🌱', es: 'Ajustar calendario de siembra', en: 'Adjust the sowing calendar' },
      ],
      down: [
        { icon: '🚰', es: 'Plan de almacenamiento', en: 'Storage plan' },
        { icon: '🔧', es: 'Cerrar fugas en la red', en: 'Close leaks in the network' },
        { icon: '🌾', es: 'Cultivos de menor consumo', en: 'Lower-water crops' },
      ],
      none: [
        { icon: '👍', es: 'Nada que cambiar por ahora', en: 'Nothing to change for now' },
        { icon: '📅', es: 'Volver a mirar en unos años', en: 'Check back in a few years' },
      ],
    },
    forWho: { es: 'Empresas de agua · agro · gobiernos locales', en: 'Water utilities · farming · local government' },
    means: [
      {
        who: { es: 'Empresa de agua o municipio', en: 'Water utility or municipality' },
        line: { es: 'Anticipar el racionamiento: revisar fuentes y almacenamiento antes de la próxima sequía larga.', en: 'Get ahead of rationing: review sources and storage before the next long drought.' },
      },
      {
        who: { es: 'Agro y cooperativas', en: 'Farmers and cooperatives' },
        line: { es: 'Elegir cultivo y decidir inversión en riego según cómo cambiaron la lluvia y la humedad del suelo.', en: 'Choose crops and decide on irrigation investment based on how rainfall and soil moisture changed.' },
      },
      {
        who: { es: 'Gobierno regional u ONG', en: 'Regional government or NGO' },
        line: { es: 'Adjuntar evidencia local medida a una solicitud de fondos de adaptación.', en: 'Attach measured local evidence to a request for adaptation funding.' },
      },
    ],
  },
  {
    id: 'extra', icon: '☀️', tint: '#64748b', open: false, featured: null, codes: ['RH2M', 'ALLSKY_SFC_SW_DWN'],
    name: { es: 'Otros indicadores', en: 'Other indicators' },
    question: { es: 'Humedad del aire y energía solar', en: 'Air humidity and solar energy' },
    context: null,
    means: [],
  },
];

export const T = {
  es: {
    'app.title': 'Earth Trend Detective',
    'app.tagline': '¿Tu lugar se está volviendo más duro para vivir?',
    'app.intro': 'El calor que sube y el agua que falta, medidos con 45 años de datos de la NASA. Para quien tiene que decidir o sustentar algo: municipios, empresas, agro, salud y organizaciones locales.',
    'search.placeholder': 'Ciudad o lugar (ej. Lima, Perú)',
    'search.button': 'Investigar',
    'search.birth': 'Tu año de nacimiento (opcional)',
    'search.map': 'o toca un punto en el mapa plano',
    'search.globe': 'Gira el globo y toca cualquier punto',
    'geo.flat': 'Ver plano',
    'geo.globe': 'Ver globo',
    'geo.zoomIn': 'Acercar',
    'geo.zoomOut': 'Alejar',
    'search.compare': 'Comparar con otro lugar',
    'demo.title': 'Casos de ejemplo',
    'loading': 'Consultando datos de la NASA…',
    'case.period': 'Datos de {from} a {to}',
    'case.source': 'Fuente: NASA POWER ({source})',
    'case.perDecade': 'por década',
    'case.range': 'entre {lo} y {hi}',
    'case.chart': 'Ver gráfica y detalle',
    'case.what': 'Qué es',
    'case.why': 'Por qué importa',
    'case.download': 'Descargar ficha',
    'case.noRate': 'No hay años suficientes para medir un cambio aquí.',
    'case.stats': 'Detalle estadístico: {n} años con dato · Mann-Kendall p = {p} · parecido entre años seguidos r = {r1}',
    'case.trendLine': 'La línea punteada es la tendencia (pendiente de Sen).',
    'case.more': 'Ver las demás variables de este capítulo',
    'case.means': 'Qué conviene hacer',
    'case.forWho': 'Útil para',
    'case.whyWorld': 'Por qué importa en el mundo',
    'case.context': 'Contexto global, no es el dato de este lugar:',
    'summary.both': 'Entre {from} y {to}, este lugar registra una variación con respaldo estadístico en el calor y también en el agua.',
    'summary.heat': 'Entre {from} y {to}, este lugar registra una variación con respaldo estadístico en el calor. En el agua no se detecta una variación significativa.',
    'summary.water': 'Entre {from} y {to}, este lugar registra una variación con respaldo estadístico en el agua. En el calor no se detecta una variación significativa.',
    'summary.none': 'Entre {from} y {to}, no se detecta una variación con respaldo estadístico ni en el calor ni en el agua de este lugar.',
    'verdict.yes': 'Sí está cambiando',
    'verdict.yes.up': 'Sí, en aumento',
    'verdict.yes.down': 'Sí, en descenso',
    'verdict.maybe': 'Posible cambio',
    'verdict.maybe.up': 'Posible aumento',
    'verdict.maybe.down': 'Posible descenso',
    'verdict.none': 'Sin evidencia de cambio',
    'verdict.insufficient': 'Datos insuficientes',
    'verdict.yes.help': 'Sería raro ver algo así por pura casualidad (menos de 5% de probabilidad).',
    'verdict.maybe.help': 'Hay señales, pero todavía podría ser casualidad.',
    'verdict.none.help': 'Los altibajos de año a año son mayores que cualquier tendencia.',
    'verdict.insufficient.help': 'Se necesitan al menos 10 años con datos completos.',
    'birth.title': 'Desde que naciste',
    'birth.since': 'Entre {from}–{fromEnd} y {to0}–{to}: {diff}',
    'birth.clamped': 'Los datos empiezan en {year}, así que comparamos desde ese año.',
    'birth.tooRecent': 'Aún no hay suficientes años desde {year} para comparar (se necesitan 20).',
    'birth.insufficient': 'No hay datos suficientes para esta comparación.',
    'compare.title': 'Mismo planeta, historias distintas',
    'compare.opposite': 'Tendencias opuestas',
    'compare.same': 'Misma dirección',
    'compare.unclear': 'Sin evidencia en al menos uno',
    'error.notFound': 'No encontramos ese lugar. Prueba con otro nombre o toca el mapa.',
    'error.api': 'No pudimos conectar con la NASA en este momento. Puedes abrir un caso de ejemplo mientras tanto.',
    'error.noData': 'La NASA no tiene datos suficientes para ese punto (suele pasar en mar abierto o cerca de los polos). Prueba con un lugar en tierra.',
    'error.search': 'El buscador de lugares no respondió. Intenta de nuevo o toca un punto en el mapa.',
    'error.birth': 'El año de nacimiento debe estar entre 1900 y {max}.',
    'method.title': 'Método y límites',
    'method': 'Calculamos el promedio de cada año y aplicamos la prueba de Mann-Kendall para saber si la serie sube o baja de forma consistente. La tasa por década es la pendiente de Sen (la mediana de los cambios entre todos los pares de años), y el rango es su intervalo de confianza del 95%. Como los años seguidos se parecen entre sí, hacemos la prueba más exigente cuanto más se parecen. El calor sentido usa la fórmula del índice de calor del NOAA sobre los valores mensuales de temperatura máxima y humedad. Límites: cada punto representa una zona de unos 50 km, no una calle; los datos vienen de un reanálisis (observaciones combinadas con un modelo), no de un termómetro local; revisamos varias variables por lugar, así que por azar alguna puede dar positivo: un resultado aislado pesa menos que varios que apuntan en la misma dirección. El resumen de arriba solo afirma que un capítulo cambió cuando su variable principal lo confirma o cuando al menos dos de sus variables coinciden: una sola variable positiva entre varias puede serlo por azar. El rango del calor sentido es algo más estrecho de lo que debería: la fórmula del NOAA cambia de tramo a los 27 °C y eso introduce pequeños escalones en la serie. Esta herramienta mide lo que ya pasó: no es un pronóstico.',
    'source': 'Datos: NASA POWER (MERRA-2, SRB/CERES). Mapa y globo: NASA GIBS y Blue Marble. Buscador: © OpenStreetMap.',
    'disclaimer': 'Mide lo que ya pasó. No es un pronóstico.',
    'lang.switch': 'English',
  },
  en: {
    'app.title': 'Earth Trend Detective',
    'app.tagline': 'Is your place becoming harder to live in?',
    'app.intro': 'Rising heat and missing water, measured with 45 years of NASA data. For people who have to decide or justify something: municipalities, companies, farming, health services and local organisations.',
    'search.placeholder': 'City or place (e.g. Lima, Peru)',
    'search.button': 'Investigate',
    'search.birth': 'Your birth year (optional)',
    'search.map': 'or tap a point on the flat map',
    'search.globe': 'Spin the globe and tap any point',
    'geo.flat': 'Flat map',
    'geo.globe': 'Globe',
    'geo.zoomIn': 'Zoom in',
    'geo.zoomOut': 'Zoom out',
    'search.compare': 'Compare with another place',
    'demo.title': 'Example cases',
    'loading': 'Asking NASA for data…',
    'case.period': 'Data from {from} to {to}',
    'case.source': 'Source: NASA POWER ({source})',
    'case.perDecade': 'per decade',
    'case.range': 'between {lo} and {hi}',
    'case.chart': 'Show chart and detail',
    'case.what': 'What it is',
    'case.why': 'Why it matters',
    'case.download': 'Download case file',
    'case.noRate': 'There are not enough years to measure a change here.',
    'case.stats': 'Statistical detail: {n} years with data · Mann-Kendall p = {p} · similarity between consecutive years r = {r1}',
    'case.trendLine': 'The dashed line is the trend (Sen slope).',
    'case.more': 'Show the other variables in this chapter',
    'case.means': 'What to do about it',
    'case.forWho': 'Useful for',
    'case.whyWorld': 'Why it matters worldwide',
    'case.context': 'Global context, not this place\'s data:',
    'summary.both': 'Between {from} and {to}, this place shows a statistically supported change in both heat and water.',
    'summary.heat': 'Between {from} and {to}, this place shows a statistically supported change in heat. No significant change is detected in water.',
    'summary.water': 'Between {from} and {to}, this place shows a statistically supported change in water. No significant change is detected in heat.',
    'summary.none': 'Between {from} and {to}, no statistically supported change is detected in either heat or water at this place.',
    'verdict.yes': 'Yes, it is changing',
    'verdict.yes.up': 'Yes, rising',
    'verdict.yes.down': 'Yes, falling',
    'verdict.maybe': 'Possible change',
    'verdict.maybe.up': 'Possibly rising',
    'verdict.maybe.down': 'Possibly falling',
    'verdict.none': 'No evidence of change',
    'verdict.insufficient': 'Not enough data',
    'verdict.yes.help': 'It would be unusual to see this by pure coincidence (less than a 5% chance).',
    'verdict.maybe.help': 'There are signs, but it could still be coincidence.',
    'verdict.none.help': 'Year-to-year ups and downs are larger than any trend.',
    'verdict.insufficient.help': 'At least 10 years of complete data are needed.',
    'birth.title': 'Since you were born',
    'birth.since': 'Between {from}–{fromEnd} and {to0}–{to}: {diff}',
    'birth.clamped': 'The data start in {year}, so we compare from that year.',
    'birth.tooRecent': 'There are not enough years since {year} to compare yet (20 are needed).',
    'birth.insufficient': 'There is not enough data for this comparison.',
    'compare.title': 'Same planet, different stories',
    'compare.opposite': 'Opposite trends',
    'compare.same': 'Same direction',
    'compare.unclear': 'No evidence in at least one',
    'error.notFound': 'We could not find that place. Try another name or tap the map.',
    'error.api': 'We could not reach NASA right now. You can open an example case meanwhile.',
    'error.noData': 'NASA does not have enough data for that point (common over open ocean or near the poles). Try a place on land.',
    'error.search': 'The place search did not respond. Try again or tap a point on the map.',
    'error.birth': 'Birth year must be between 1900 and {max}.',
    'method.title': 'Method and limits',
    'method': 'We average each year and apply the Mann-Kendall test to see whether the series rises or falls consistently. The rate per decade is the Sen slope (the median change across all pairs of years), and the range is its 95% confidence interval. Because consecutive years resemble each other, we make the test stricter the more they do. Felt heat uses the NOAA heat index formula on monthly maximum temperature and humidity. Limits: each point stands for an area about 50 km wide, not a street; the data come from a reanalysis (observations combined with a model), not a local thermometer; we check several variables per place, so one may come out positive by chance: a single result weighs less than several pointing the same way. The summary above only claims a chapter changed when its main variable confirms it or when at least two of its variables agree: a single positive among several can be chance. The felt-heat range is somewhat narrower than it should be: the NOAA formula switches branch at 27 °C, which introduces small steps in the series. This tool measures what already happened: it is not a forecast.',
    'source': 'Data: NASA POWER (MERRA-2, SRB/CERES). Map and globe: NASA GIBS and Blue Marble. Search: © OpenStreetMap.',
    'disclaimer': 'It measures what already happened. It is not a forecast.',
    'lang.switch': 'Español',
  },
};

/**
 * Returns an interface text. Replaces {name} with vars.name.
 * @param {'es'|'en'} lang  @param {string} key  @param {object} [vars]
 */
export function t(lang, key, vars = {}) {
  const s = (T[lang] || T.es)[key];
  if (s === undefined) return key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export const unitOf = (variable, lang) => (lang === 'en' && variable.unitEn) || variable.unit;
