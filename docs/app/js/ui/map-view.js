// Map of schools, stations, distance circles and epicenters (Leaflet).
import * as L from '../../vendor/leaflet.js';
import { ATTRIBUTION } from '../config.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function triangle(color, label) {
  return L.divIcon({
    className: 'map-station',
    html: `<svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true">
      <polygon points="9,1 17,15 1,15" fill="${color}" stroke="#111" stroke-width="1.2"/></svg>
      <span>${esc(label)}</span>`,
    iconSize: [18, 16],
    iconAnchor: [9, 12],
  });
}

function star(cls, title) {
  return L.divIcon({
    className: `map-star ${cls}`,
    html: `<svg width="26" height="26" viewBox="0 0 24 24" aria-label="${esc(title)}">
      <polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6"
        stroke="#111" stroke-width="1.2"/></svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export class MapView {
  constructor(el, { onStationClick } = {}) {
    // No initial view: the first fitTo() sets it, so no tiles are fetched and then
    // thrown away (kinder to the OpenStreetMap tile servers).
    this.map = L.map(el, { zoomSnap: 0.5, scrollWheelZoom: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 14,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.schools = L.layerGroup().addTo(this.map);
    this.stations = L.layerGroup().addTo(this.map);
    this.circles = L.layerGroup().addTo(this.map);
    this.solution = L.layerGroup().addTo(this.map);
    this.official = L.layerGroup().addTo(this.map);
    this.onStationClick = onStationClick || (() => {});
    this.attribution = ATTRIBUTION.map;
  }

  invalidate() { this.map.invalidateSize(); }

  showSchools(schools) {
    this.schools.clearLayers();
    for (const s of schools) {
      L.circleMarker([s.lat, s.lon], { radius: 5, color: '#111', weight: 1, fillColor: '#fbbf24', fillOpacity: 1 })
        .bindTooltip(`${esc(s.name)} (${esc(s.town)})`)
        .addTo(this.schools);
    }
  }

  /** @param {Array<{key:string, sta:string, lat:number, lon:number, color:string, schools:string[]}>} stations */
  showStations(stations) {
    this.stations.clearLayers();
    for (const s of stations) {
      const tip = s.schools.length ? `${s.sta}: stand-in for ${s.schools.join(', ')}` : `${s.sta}: helper station`;
      L.marker([s.lat, s.lon], { icon: triangle(s.color, s.sta), keyboard: true, title: tip })
        .on('click', () => this.onStationClick(s.key))
        .addTo(this.stations);
    }
  }

  fitTo(points, padKm = 20) {
    if (!points.length) return;
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    this.map.fitBounds(b.pad(0.08), { maxZoom: 10, padding: [padKm, padKm] });
  }

  /** @param {Array<{lat:number, lon:number, radiusKm:number, color:string}>} circles */
  setCircles(circles) {
    this.circles.clearLayers();
    for (const c of circles) {
      L.circle([c.lat, c.lon], { radius: c.radiusKm * 1000, color: c.color, weight: 2,
        fill: false, interactive: false }).addTo(this.circles);
    }
  }

  setSolution(sol) {
    this.solution.clearLayers();
    if (!sol) return;
    L.circle([sol.lat, sol.lon], { radius: sol.uncertaintyKm * 1000, color: '#7c3aed', weight: 1.5,
      dashArray: '6 5', fillColor: '#7c3aed', fillOpacity: 0.08, interactive: false }).addTo(this.solution);
    L.marker([sol.lat, sol.lon], { icon: star('star-student', 'Your epicenter'), zIndexOffset: 1000 })
      .bindTooltip('Your epicenter').addTo(this.solution);
  }

  setOfficial(event, sol) {
    this.official.clearLayers();
    if (!event) return;
    L.marker([event.lat, event.lon], { icon: star('star-official', 'Official epicenter'), zIndexOffset: 900 })
      .bindTooltip(`Official epicenter (UUSS/USGS): ${esc(event.place)}`).addTo(this.official);
    if (sol) {
      L.polyline([[sol.lat, sol.lon], [event.lat, event.lon]], { color: '#111', weight: 1.5,
        dashArray: '4 4', interactive: false }).addTo(this.official);
    }
  }
}
