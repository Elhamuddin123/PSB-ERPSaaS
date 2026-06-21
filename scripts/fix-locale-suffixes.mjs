/**
 * Remove i18next auto-suffixed duplicate keys from locale files and fix source code references.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const SRC = path.join(ROOT, "src");
const LANGS = ["en", "fa", "ps"];

const SUFFIX_RE = /_(\d+(_\d+)*)$/;

/** Keys where suffixed variant has a distinct meaning — map to explicit canonical key */
const EXPLICIT_CANONICAL = {
  due_date_1_2: "due_date_required",
  status_1: "statusColumn",
  statusColumn: "statusColumn",
};

/** Column/header keys that should use statusColumn instead of status */
const USE_STATUS_COLUMN = new Set([
  "status_1", "status_1_1", "status_1_1_1", "status_1_1_1_1",
  "status_1_1_1_1_1", "status_1_1_1_1_1_1", "status_1_1_1_1_1_1_1",
  "status_1_1_1_1_1_1_1_1", "status_1_1_1_1_1_1_1_1_1", "status_1_1_1_1_1_1_1_1_1_1",
  "status_1_1_1_1_1_1_1_1_1_1_1", "status_1_1_1_1_1_1_1_1_1_1_1_1",
  "status_1_1_1_1_1_1_1_1_1_1_1_1_1", "status_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "status_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1", "status_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
]);

/** Keys ending in _digits that are intentional identifiers, not i18next duplicates */
const PROTECTED_KEYS = new Set([
  "1_30_days", "31_60_days", "61_90_days", "over_90",
  "min_8_characters", "je_2026_xxx", "close_wallet_must_have_0_balance",
]);

function stripSuffix(key) {
  if (PROTECTED_KEYS.has(key)) return key;
  return key.replace(SUFFIX_RE, "");
}

function canonicalKey(key) {
  if (PROTECTED_KEYS.has(key)) return key;
  if (EXPLICIT_CANONICAL[key]) return EXPLICIT_CANONICAL[key];
  if (USE_STATUS_COLUMN.has(key)) return "statusColumn";
  const base = stripSuffix(key);
  if (base === "status" && SUFFIX_RE.test(key)) return "statusColumn";
  return base;
}

function walkDir(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "locales") walkDir(full, files);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(full);
  }
  return files;
}

// --- Phase 1: collect all suffixed keys and build replacement map ---
const allSuffixedInLocales = new Map(); // key -> en value
for (const lang of LANGS) {
  const langDir = path.join(PUBLIC, lang);
  for (const file of fs.readdirSync(langDir)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(langDir, file), "utf8"));
    for (const [k, v] of Object.entries(data)) {
      if (SUFFIX_RE.test(k) && lang === "en") {
        allSuffixedInLocales.set(k, v);
      }
    }
  }
}

const replacementMap = new Map();
for (const suffixed of allSuffixedInLocales.keys()) {
  replacementMap.set(suffixed, canonicalKey(suffixed));
}

// --- Phase 2: fix source code ---
const tPattern = /(\bt|\btc)\(\s*(['"])([a-zA-Z0-9_.]+)\2/g;
let codeFilesFixed = 0;
let codeReplacements = 0;

for (const file of walkDir(SRC)) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;
  content = content.replace(tPattern, (match, fn, quote, key) => {
    if (!SUFFIX_RE.test(key)) return match;
    const canon = replacementMap.get(key) ?? canonicalKey(key);
    if (canon !== key) {
      changed = true;
      codeReplacements++;
      return `${fn}(${quote}${canon}${quote}`;
    }
    return match;
  });
  if (changed) {
    fs.writeFileSync(file, content);
    codeFilesFixed++;
  }
}

// --- Phase 3: remove suffixed keys from locale files, ensure canonical keys exist ---
let suffixedRemoved = 0;
const keysAdded = [];

for (const lang of LANGS) {
  const langDir = path.join(PUBLIC, lang);
  for (const file of fs.readdirSync(langDir)) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(langDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const toRemove = [];
    for (const k of Object.keys(data)) {
      if (SUFFIX_RE.test(k)) {
        toRemove.push(k);
        const canon = replacementMap.get(k) ?? canonicalKey(k);
        if (!(canon in data)) {
          data[canon] = data[k];
          if (lang === "en") keysAdded.push(`${file}: ${canon} (from ${k})`);
        }
      }
    }
    for (const k of toRemove) {
      delete data[k];
      suffixedRemoved++;
    }
    // Sort keys alphabetically for consistency
    const sorted = {};
    for (const k of Object.keys(data).sort()) sorted[k] = data[k];
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n");
  }
}

// Add due_date_required translations if missing
for (const lang of LANGS) {
  const commonPath = path.join(PUBLIC, lang, "common.json");
  const data = JSON.parse(fs.readFileSync(commonPath, "utf8"));
  if (!data.due_date_required) {
    const labels = {
      en: "Due Date *",
      fa: "تاریخ سررسید *",
      ps: "د تادیې نیټه *",
    };
    data.due_date_required = labels[lang];
    const sorted = {};
    for (const k of Object.keys(data).sort()) sorted[k] = data[k];
    fs.writeFileSync(commonPath, JSON.stringify(sorted, null, 2) + "\n");
  }
}

console.log("Locale suffix cleanup complete");
console.log(`Suffixed keys removed: ${suffixedRemoved}`);
console.log(`Code files fixed: ${codeFilesFixed}`);
console.log(`Code replacements: ${codeReplacements}`);
if (keysAdded.length) {
  console.log("Canonical keys promoted from suffixed:");
  keysAdded.slice(0, 20).forEach((k) => console.log(`  ${k}`));
  if (keysAdded.length > 20) console.log(`  ... and ${keysAdded.length - 20} more`);
}
