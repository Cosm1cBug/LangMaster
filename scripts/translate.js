/**
 * scripts/translate.js
 *
 * Usage:
 *   # make sure LibreTranslate is running (docker compose up -d)
 *   node scripts/translate.js
 *
 * Environment (from .env or env):
 *   LT_URL        - http://localhost:5000/translate  (default used if not set)
 *   SOURCE_LANG   - source language code (default: en)
 *   LANGUAGES     - comma-separated target languages (es,fr,..)
 *   CONCURRENCY   - number of languages to process in parallel (default: 2-4)
 *   BATCH_SIZE    - how many strings to send in one API call (default: 25)
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

require('dotenv').config();

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'locale');
const CACHE_FILE = path.join(__dirname, 'translation-cache.json');

const LT_URL = process.env.LT_URL || 'http://localhost:5000/translate';
const SOURCE_LANG = process.env.SOURCE_LANG || 'en';
const LANGUAGES = (process.env.LANGUAGES || 'es,fr').split(',').map(s => s.trim()).filter(Boolean);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '25', 10);

fs.ensureDirSync(LOCALE_DIR);

let CACHE = {};
try { CACHE = fs.readJsonSync(CACHE_FILE); } catch (e) { CACHE = {}; }

function saveCache() {
  try { fs.writeJsonSync(CACHE_FILE, CACHE, { spaces: 2 }); } catch (e) { console.warn('Cache save failed', e.message); }
}

function flatten(obj, prefix = '') {
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

function unflatten(flat) {
  const out = {};
  for (const compound of Object.keys(flat)) {
    const parts = compound.split('.');
    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) {
        cur[p] = flat[compound];
      } else {
        cur[p] = cur[p] || {};
        cur = cur[p];
      }
    }
  }
  return out;
}

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

async function retry(fn, retries = 5, initialDelay = 300) {
  let attempt = 0;
  let delay = initialDelay;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function prewarm() {
  try {
    await axios.get(LT_URL.replace(/\\/translate$/, '/languages').replace(/translate$/, 'languages'));
  } catch (e) {
    // ignore - prewarm is best-effort
  }
}

async function batchTranslate(phrases, target) {
  // API supports sending array q:[] -> returns array of translations
  const payload = { q: phrases, source: SOURCE_LANG, target, format: 'text' };
  const res = await retry(() => axios.post(LT_URL, payload, { headers: { 'Content-Type': 'application/json' } }));
  // response could be { translatedText: ... } or array; normalize:
  if (Array.isArray(res.data)) return res.data.map(r => r.translatedText || r);
  if (res.data && Array.isArray(res.data.translatedText)) return res.data.translatedText;
  // single string fallback (shouldn't happen for array input)
  return phrases.map(() => res.data.translatedText || '');
}

function cacheKey(text, target) {
  return `${SOURCE_LANG}::${target}::${text}`;
}

async function translateWithCache(phrases, target) {
  // phrases: array of original English strings
  const result = [];
  const toTranslate = [];
  const mapIndexToTranslateIndex = {};

  phrases.forEach((p, idx) => {
    const key = cacheKey(p, target);
    if (CACHE[key]) {
      result[idx] = CACHE[key];
    } else {
      mapIndexToTranslateIndex[idx] = toTranslate.length;
      toTranslate.push(p);
    }
  });

  if (toTranslate.length === 0) return result;

  // Break into sub-batches to avoid huge requests
  const batches = chunkArray(toTranslate, BATCH_SIZE);
  let translatedFlat = [];
  for (const b of batches) {
    const translated = await batchTranslate(b, target);
    translatedFlat = translatedFlat.concat(translated);
    // be gentle
    await new Promise(r => setTimeout(r, 120));
  }

  // apply translations & cache
  Object.keys(mapIndexToTranslateIndex).forEach(strIdx => {
    const tIdx = mapIndexToTranslateIndex[strIdx];
    const translated = translatedFlat[tIdx] || '';
    const orig = phrases[strIdx];
    const k = cacheKey(orig, target);
    CACHE[k] = translated;
    result[strIdx] = translated;
  });

  saveCache();
  return result;
}

function objectValuesInOrder(flatSrc) {
  // return array of values in stable order (keys sorted) and keys array
  const keys = Object.keys(flatSrc).sort();
  const values = keys.map(k => String(flatSrc[k] == null ? '' : flatSrc[k]));
  return { keys, values };
}

async function translateLanguage(lang, flatSrc, existingFlat) {
  console.log('Translating language:', lang);
  // prepare list of keys that need translation
  const keys = Object.keys(flatSrc).sort();
  const toTranslateKeys = keys.filter(k => existingFlat[k] === undefined || existingFlat[k] === null || existingFlat[k] === '');
  if (toTranslateKeys.length === 0) {
    console.log('  All keys exist for', lang);
    return existingFlat;
  }

  // gather their source values in stable order
  const phrases = toTranslateKeys.map(k => String(flatSrc[k] == null ? '' : flatSrc[k]));

  // batch + cached translate
  const translatedValues = await translateWithCache(phrases, lang);

  // merge translated values into existingFlat (without overwriting existing ones)
  const out = Object.assign({}, existingFlat);
  toTranslateKeys.forEach((k, i) => {
    out[k] = translatedValues[i] || '';
  });

  return out;
}

async function run() {
  const srcPath = path.join(LOCALE_DIR, `${SOURCE_LANG}.json`);
  if (!fs.existsSync(srcPath)) {
    console.error('Source file missing:', srcPath);
    process.exit(1);
  }

  const srcObj = fs.readJsonSync(srcPath);
  const flatSrc = flatten(srcObj);

  // prewarm libretranslate (best-effort)
  try { await prewarm(); } catch (e) { /* ignore */ }

  // prepare concurrency pool (simple)
  const langs = (process.env.LANGUAGES || LANGUAGES.join(',')).split(',').map(s => s.trim()).filter(Boolean).filter(l => l !== SOURCE_LANG);

  const pool = [];
  for (let i = 0; i < langs.length; i += CONCURRENCY) {
    const slice = langs.slice(i, i + CONCURRENCY);
    // process slice in parallel
    await Promise.all(slice.map(async (lang) => {
      const outPath = path.join(LOCALE_DIR, `${lang}.json`);
      let existingFlat = {};
      if (fs.existsSync(outPath)) {
        existingFlat = flatten(fs.readJsonSync(outPath));
      }
      const translatedFlat = await translateLanguage(lang, flatSrc, existingFlat);
      const nested = unflatten(translatedFlat);
      fs.writeJsonSync(outPath, nested, { spaces: 2 });
      console.log('Saved', outPath);
    }));
  }

  console.log('Translation pass completed.');
}

run().catch(err => {
  console.error('Fatal error:', err && err.message ? err.message : err);
  process.exit(1);
});
