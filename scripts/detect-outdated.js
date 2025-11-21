/**
 * scripts/detect-outdated.js
 * - Quick check to detect structural differences between en.json and other locale files
 *
 * Usage:
 *   SOURCE_LANG=en LANGUAGES=es,fr node scripts/detect-outdated.js
 */
const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'locale');
const SOURCE_LANG = process.env.SOURCE_LANG || 'en';
const LANGUAGES = (process.env.LANGUAGES || 'es,fr,de,hi').split(',').map(s => s.trim()).filter(Boolean);

function normalize(obj) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj).sort();
    const out = {};
    for (const k of keys) out[k] = normalize(obj[k]);
    return out;
  }
  return obj;
}

(async () => {
  const srcPath = path.join(LOCALE_DIR, `${SOURCE_LANG}.json`);
  if (!fs.existsSync(srcPath)) { console.error('Missing', srcPath); process.exit(1); }
  const src = normalize(fs.readJsonSync(srcPath));

  for (const lang of LANGUAGES) {
    if (lang === SOURCE_LANG) continue;
    const file = path.join(LOCALE_DIR, `${lang}.json`);
    if (!fs.existsSync(file)) {
      console.log(`${lang}.json: MISSING`);
      continue;
    }
    const trg = normalize(fs.readJsonSync(file));
    const srcStr = JSON.stringify(src);
    const trgStr = JSON.stringify(trg);
    if (srcStr !== trgStr) {
      console.log(`${lang}.json: MAY BE OUTDATED (structure differs)`);
    } else {
      console.log(`${lang}.json: OK`);
    }
  }
})();
