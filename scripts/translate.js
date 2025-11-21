/**
 * scripts/translate.js
 * - Reads locale/en.json
 * - Translates missing keys into LANGUAGES (env) using LIBRE_URL
 * - Preserves existing translations
 * - Supports nested objects
 * - Uses simple cache to reduce API calls
 *
 * Usage:
 *   LIBRE_URL=http://localhost:5000/translate LANGUAGES=es,fr,de node scripts/translate.js
 *
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'locale');
const CACHE_FILE = path.join(__dirname, 'translation-cache.json');

const LIBRE_URL = process.env.LIBRE_URL || process.env.LT_URL || 'http://localhost:5000/translate';
const SOURCE_LANG = process.env.SOURCE_LANG || 'en';
const LANGUAGES = (process.env.LANGUAGES || 'es,fr,de,hi').split(',').map(s => s.trim()).filter(Boolean);

let CACHE = {};
try { CACHE = fs.readJsonSync(CACHE_FILE); } catch (e) { CACHE = {}; }

function saveCache() {
  try { fs.writeJsonSync(CACHE_FILE, CACHE, { spaces: 2 }); } catch (e) { /* ignore */ }
}

async function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

async function translateText(text, target) {
  if (!text && text !== '') return text;
  const key = `${SOURCE_LANG}__${target}__${text}`;
  if (CACHE[key]) return CACHE[key];

  try {
    const res = await axios.post(LIBRE_URL, {
      q: text,
      source: SOURCE_LANG,
      target,
      format: 'text'
    }, { headers: { 'Content-Type': 'application/json' } });

    const translated = res.data.translatedText || res.data.translated || '';
    CACHE[key] = translated;
    saveCache();
    await delay(250); // friendly delay
    return translated;
  } catch (err) {
    console.error('Translate error:', err.message || err);
    return text;
  }
}

function isObject(o) { return o && typeof o === 'object' && !Array.isArray(o); }

async function translateObject(srcObj, existingObj, target) {
  const out = {};
  for (const k of Object.keys(srcObj)) {
    const srcVal = srcObj[k];
    const existingVal = existingObj && existingObj[k];

    if (isObject(srcVal)) {
      out[k] = await translateObject(srcVal, existingVal || {}, target);
    } else {
      if (existingVal !== undefined && existingVal !== null && existingVal !== '') {
        out[k] = existingVal; // keep existing translation
      } else {
        out[k] = await translateText(String(srcVal || ''), target);
      }
    }
  }
  return out;
}

async function batchTranslate(textArray, from, to) {
  const response = await axios.post(`${LT_URL}/translate`, {
    q: textArray,
    source: from,
    target: to,
    format: "text"
  });

  return response.data;
}

async function main() {
  const srcPath = path.join(LOCALE_DIR, `${SOURCE_LANG}.json`);
  if (!fs.existsSync(srcPath)) {
    console.error('Missing source locale:', srcPath);
    process.exit(1);
  }
  const src = fs.readJsonSync(srcPath);

  for (const lang of LANGUAGES) {
    if (lang === SOURCE_LANG) continue;
    const outPath = path.join(LOCALE_DIR, `${lang}.json`);
    let existing = {};
    if (fs.existsSync(outPath)) {
      existing = fs.readJsonSync(outPath);
    }
    console.log('Processing', lang);
    const translated = await translateObject(src, existing, lang);
    fs.writeJsonSync(outPath, translated, { spaces: 2 });
    console.log('Saved', outPath);
  }
  console.log('All done');
}

main().catch(err => { console.error(err); process.exit(1); });
