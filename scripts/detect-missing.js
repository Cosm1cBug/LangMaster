/**
 * scripts/detect-missing.js
 * - Compares keys in en.json with other languages and lists missing keys
 *
 * Usage:
 *   NODE_ENV=production SOURCE_LANG=en LANGUAGES=es,fr node scripts/detect-missing.js
 */
const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'locale');
const SOURCE_LANG = process.env.SOURCE_LANG || 'en';
const LANGUAGES = (process.env.LANGUAGES || 'es,fr,de,hi').split(',').map(s => s.trim()).filter(Boolean);

function flatten(obj, prefix='') {
  const out = {};
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, full));
    } else {
      out[full] = v;
    }
  }
  return out;
}

(async () => {
  const srcPath = path.join(LOCALE_DIR, `${SOURCE_LANG}.json`);
  if (!fs.existsSync(srcPath)) { console.error('Missing', srcPath); process.exit(1); }
  const src = flatten(fs.readJsonSync(srcPath));

  for (const lang of LANGUAGES) {
    if (lang === SOURCE_LANG) continue;
    const file = path.join(LOCALE_DIR, `${lang}.json`);
    if (!fs.existsSync(file)) {
      console.log(`MISSING FILE: ${lang}.json`);
      continue;
    }
    const trg = flatten(fs.readJsonSync(file));
    const missing = Object.keys(src).filter(k => !(k in trg));
    if (missing.length) {
      console.log(`
${lang}.json is missing ${missing.length} keys:`);
      missing.forEach(m => console.log('  -', m));
    } else {
      console.log(`${lang}.json is complete`);
    }
  }
})();
