// Regenerate the vendored ESM bundles in docs/app/vendor/.
//
//   cd tools/vendor && npm install && npm run build
//
// Versions are pinned in package.json (seisplotjs 3.3.0, leaflet 1.9.4).
// Writes:
//   seisplotjs.js              miniseed + filter modules (ESM, minified)
//   leaflet.js, leaflet.css    Leaflet (ESM build), plus images/
//   THIRD_PARTY_LICENSES.txt   license text of every bundled package
//   VERSIONS.json              what was bundled, for the docs and for humans
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../docs/app/vendor');
const nm = path.join(here, 'node_modules');
fs.mkdirSync(out, { recursive: true });

const pkg = (name) => JSON.parse(fs.readFileSync(path.join(nm, name, 'package.json'), 'utf8'));

async function bundle(entry, outfile, label) {
  const result = await esbuild.build({
    entryPoints: [entry],
    outfile: path.join(out, outfile),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    metafile: true,
    banner: { js: `/* ${label}. Bundled for UHSN apps by tools/vendor/build.mjs; licenses in THIRD_PARTY_LICENSES.txt */` },
  });
  // Package names that ended up in the bundle.
  const names = new Set();
  for (const input of Object.keys(result.metafile.inputs)) {
    const m = /node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(input);
    if (m) names.add(m[1].replace(/\\/g, '/'));
  }
  const bytes = fs.statSync(path.join(out, outfile)).size;
  console.log(`${outfile}: ${(bytes / 1024).toFixed(0)} KB from ${[...names].join(', ')}`);
  return names;
}

const sp = pkg('seisplotjs');
const lf = pkg('leaflet');
const used = new Set([
  ...await bundle(path.join(here, 'seisplotjs-entry.js'), 'seisplotjs.js', `seisplotjs ${sp.version} (MIT)`),
  ...await bundle(path.join(nm, 'leaflet/dist/leaflet-src.esm.js'), 'leaflet.js', `Leaflet ${lf.version} (BSD-2-Clause)`),
]);

fs.copyFileSync(path.join(nm, 'leaflet/dist/leaflet.css'), path.join(out, 'leaflet.css'));
fs.cpSync(path.join(nm, 'leaflet/dist/images'), path.join(out, 'images'), { recursive: true });

// Collect licenses.
let licenses = 'Third-party code bundled in this folder\n=======================================\n';
const versions = {};
for (const name of [...used].sort()) {
  const p = pkg(name);
  versions[name] = p.version;
  const dir = path.join(nm, name);
  const file = fs.readdirSync(dir).find((f) => /^(license|licence|copying)/i.test(f));
  const text = file ? fs.readFileSync(path.join(dir, file), 'utf8').trim()
    : `(no license file in package; package.json says: ${p.license})`;
  licenses += `\n\n${name} ${p.version} (${p.license})\n${'-'.repeat(60)}\n${text}\n`;
}
fs.writeFileSync(path.join(out, 'THIRD_PARTY_LICENSES.txt'), licenses);
fs.writeFileSync(path.join(out, 'VERSIONS.json'), JSON.stringify(versions, null, 2) + '\n');
console.log('wrote', out);
