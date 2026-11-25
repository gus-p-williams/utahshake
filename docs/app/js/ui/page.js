// Page helpers shared by every UHSN app page (docs/app/<slug>/index.html): credits,
// data-source badge, HTML escaping, CSV download, embed mode and the docs' light/dark switch.
// Quake Locator, Quake Waves and the P/S motion cartoon use it; Quake Explorer will too.
//
// The top bar is NOT built here: its links are plain href attributes in each page's HTML,
// so tests/doc-links.test.js checks them (this comment avoids quoted hrefs for the same
// reason). Copy the bar from wave-race/index.html; the convention is in
// docs/developers/adding-an-app.md:
//
//   header.topbar
//     div.brand          a.home "UHSN · All apps" -> ../../apps/ (same tab), then the h1
//     nav.topbar-right   app-specific controls first (Quake Locator: source badge and switch), then
//                        "Guide ↗"          -> ../../apps/<slug>/ (new tab)
//                        "About the data ↗" -> ../../theory/stations/ (new tab)
//                        each new-tab link ends in span.visually-hidden " (opens in a new tab)"
//   footer.credits#credits   filled by showCredits() on pages that show real data
//
// Embed mode (?embed=1, or inside an iframe; see setupEmbed): app.css hides .topbar, .credits
// and .standalone-only, and shows .embed-only. Links written by this module assume the page
// is at docs/app/<slug>/index.html (two folders below the site root).
//
// API:
//   esc(s)                      HTML-escape any value for innerHTML text or attributes.
//   setupEmbed()                Add body.embed when the page has ?embed or is in an iframe; returns true if so.
//   followDocsTheme(onChange)   Inside a docs page, follow its light/dark switch; onChange() redraws.
//   showCredits(el, keys?)      Fill the credits footer: ATTRIBUTION[keys] (config.js) + "About the data".
//   showSourceBadge(el, source) Label a DataSource as "Live data" or "Offline sample".
//   csvRow(values)              One CSV line; quotes fields that contain a quote, comma or newline.
//   downloadCsv(filename, lines) Save lines (strings) as a .csv file on the student's device.
import { ATTRIBUTION } from '../config.js';

/** HTML-escape a value (text or attribute). */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Embed mode: ?embed in the address, or the page is inside an iframe. Adds body.embed. */
export function setupEmbed() {
  const embedded = new URLSearchParams(location.search).has('embed') || window.parent !== window;
  if (embedded) document.body.classList.add('embed');
  return embedded;
}

/**
 * In a docs page (same site), follow the docs' light/dark switch instead of the device:
 * sets data-theme on <html> (app.css honours it) and calls onChange() after each switch.
 */
export function followDocsTheme(onChange = () => {}) {
  try {
    if (window.parent === window) return;
    const body = window.parent.document.body;
    const apply = () => {
      const scheme = body.getAttribute('data-md-color-scheme');
      if (!scheme) return;
      document.documentElement.dataset.theme = scheme === 'slate' ? 'dark' : 'light';
      onChange();
    };
    apply();
    new MutationObserver(apply).observe(body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
  } catch { /* another site: keep following the device */ }
}

/** Credits footer: the data sources this page shows (keys of ATTRIBUTION), then "About the data". */
export function showCredits(el, keys = ['waveforms', 'events', 'map']) {
  el.innerHTML = `${keys.map((k) => esc(ATTRIBUTION[k])).join(' ')}
    <a href="../../theory/stations/" target="_blank" rel="noopener">About the data ↗<span class="visually-hidden"> (opens in a new tab)</span></a>.`;
}

/** Badge showing where the data comes from (a DataSource: live or offline sample). */
export function showSourceBadge(el, source) {
  el.textContent = source.live ? 'Live data' : 'Offline sample';
  el.className = `badge ${source.live ? 'live' : 'offline'}`;
}

/** One CSV line from values (null/undefined -> empty). */
export function csvRow(values) {
  return values.map((v) => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

/**
 * Save lines as a CSV file (downloaded in the browser; nothing is sent anywhere). The link is
 * put in the page for the click and its address kept for a minute: Safari on iPhones asks
 * "Download?" first and needs the file still there when the user answers.
 */
export function downloadCsv(filename, lines) {
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
