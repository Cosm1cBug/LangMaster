/**
 * scripts/detect-outdated.js
 */
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'locale');
const SOURCE_LANG = process.env.SOURCE_LANG || 'en';
const LANGUAGES = (process.env.LANGUAGES || '').split(',').map(s => s.trim()).filter(Boolean);

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
    const file = path.join(LOCALE_DIR, `${lang}.json`);
    if (!fs.existsSync(file)) {
      console.log(`${lang}.json: MISSING`);
      continue;
    }
    const trg = normalize(fs.readJsonSync(file));
    if (JSON.stringify(src) !== JSON.stringify(trg)) {
      console.log(`${lang}.json: STRUCTURE DIFFERS or CONTENT DIFFERS -> may be outdated`);
    } else {
      console.log(`${lang}.json: OK`);
    }
  }
})();
