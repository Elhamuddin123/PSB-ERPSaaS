/**
 * Validate locale files: key parity, code coverage, untranslated fa/ps detection.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_LOCALES = path.join(ROOT, "src", "locales");
if (fs.existsSync(SRC_LOCALES)) {
  console.error("ERROR: src/locales/ must not exist. Runtime locales live in public/locales/ only.");
  process.exit(1);
}
const PUBLIC = path.join(ROOT, "public", "locales");
const SRC = path.join(ROOT, "src");
const LANGS = ["en", "fa", "ps"];
const NAMESPACES = [
  "common", "login", "register", "dashboard", "sidebar", "admin",
  "tickets", "customers", "reports", "invoices",
];

const ALLOWLIST_IDENTICAL = new Set([
  "officeEmail",
  "PSB ERP",
  "ERP",
  "PNR",
  "JFK",
  "LHR",
  "ABC123",
]);

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function walkDir(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "locales") walkDir(full, files);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function isLikelyUntranslated(enVal, otherVal) {
  if (!enVal || !otherVal) return false;
  if (enVal === otherVal) {
    if (ALLOWLIST_IDENTICAL.has(enVal)) return false;
    if (/^[\d\s$.,:+\-()%@#]+$/.test(enVal)) return false;
    if (/^\+?\d[\d\s\-()]+$/.test(enVal)) return false;
    if (/@/.test(enVal) && enVal === otherVal) return false;
    if (enVal.length <= 3 && /^[A-Z0-9]+$/.test(enVal)) return false;
    return true;
  }
  return false;
}

// Load all locale data
const localeData = {};
for (const lang of LANGS) {
  localeData[lang] = {};
  for (const ns of NAMESPACES) {
    localeData[lang][ns] = flatten(readJson(path.join(PUBLIC, lang, `${ns}.json`)));
  }
}

const report = {
  parityErrors: [],
  missingInLocales: [],
  untranslatedFa: [],
  untranslatedPs: [],
  stats: {},
};

// Parity check per namespace
for (const ns of NAMESPACES) {
  const enKeys = new Set(Object.keys(localeData.en[ns]));
  for (const lang of ["fa", "ps"]) {
    const langKeys = new Set(Object.keys(localeData[lang][ns]));
    for (const k of enKeys) {
      if (!langKeys.has(k)) report.parityErrors.push({ ns, lang, key: k, type: "missing" });
    }
    for (const k of langKeys) {
      if (!enKeys.has(k)) report.parityErrors.push({ ns, lang, key: k, type: "extra" });
    }
  }
}

// Untranslated check (fa/ps same as en)
for (const ns of NAMESPACES) {
  for (const key of Object.keys(localeData.en[ns])) {
    const enVal = localeData.en[ns][key];
    if (isLikelyUntranslated(enVal, localeData.fa[ns][key])) {
      report.untranslatedFa.push({ ns, key, value: enVal });
    }
    if (isLikelyUntranslated(enVal, localeData.ps[ns][key])) {
      report.untranslatedPs.push({ ns, key, value: enVal });
    }
  }
}

// Scan source for t() keys
const codeFiles = walkDir(SRC);
const tKeyPattern = /(?:^|[^\w])(?:t|tc)\(\s*["']([a-zA-Z0-9_.]+)["']/g;
const nsPattern = /useTranslation\(\s*(?:\[([^\]]+)\]|["']([^"']+)["'])/g;

const usedKeys = new Map(); // "ns:key" -> files

for (const file of codeFiles) {
  const content = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);

  // Only check key in the primary namespace for each t() call
  let defaultNs = "common";
  const nsMatches = [...content.matchAll(nsPattern)];
  if (nsMatches.length) {
    const m = nsMatches[0];
    if (m[2]) defaultNs = m[2];
    else if (m[1]) {
      const parsed = m[1].match(/["']([^"']+)["']/);
      if (parsed) defaultNs = parsed[1];
    }
  }

  const namespaces = [defaultNs];
  const nsMatch = content.match(/useTranslation\(\s*\[([^\]]+)\]/);
  if (nsMatch) {
    for (const part of nsMatch[1].match(/["']([^"']+)["']/g) || []) {
      namespaces.push(part.replace(/['"]/g, ""));
    }
  } else {
    namespaces.push("common");
  }
  const nsToCheck = [...new Set(namespaces)];

  for (const m of content.matchAll(tKeyPattern)) {
    const key = m[1];
    const found = nsToCheck.some((ns) => localeData.en[ns]?.[key]);
    if (!found) {
      const full = `${defaultNs}:${key}`;
      if (!usedKeys.has(full)) usedKeys.set(full, []);
      usedKeys.get(full).push(rel);
    } else {
      // mark as found using first matching ns
      const ns = nsToCheck.find((n) => localeData.en[n]?.[key]) || defaultNs;
      const full = `${ns}:${key}`;
      if (!usedKeys.has(full)) usedKeys.set(full, []);
      usedKeys.get(full).push(rel);
    }
  }

  // tc() always uses common
  const tcPattern = /tc\(\s*["']([a-zA-Z0-9_.]+)["']/g;
  for (const m of content.matchAll(tcPattern)) {
    const full = `common:${m[1]}`;
    if (!usedKeys.has(full)) usedKeys.set(full, []);
    usedKeys.get(full).push(rel);
  }
}

// Check used keys exist in en locales
for (const [full, files] of usedKeys) {
  const [ns, key] = full.split(":");
  if (!NAMESPACES.includes(ns)) continue;
  if (!localeData.en[ns][key]) {
    // already filtered during scan; double-check
    const inAnyNs = NAMESPACES.some((n) => localeData.en[n][key]);
    if (!inAnyNs) {
      report.missingInLocales.push({ ns, key, files: [...new Set(files)].slice(0, 3) });
    }
  }
}

report.stats = {
  parityErrorCount: report.parityErrors.length,
  missingInLocalesCount: report.missingInLocales.length,
  untranslatedFaCount: report.untranslatedFa.length,
  untranslatedPsCount: report.untranslatedPs.length,
  usedKeyCount: usedKeys.size,
};

const outPath = path.join(ROOT, "locale-validation-report.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log("Locale Validation Report");
console.log("========================");
console.log(`Parity errors: ${report.stats.parityErrorCount}`);
console.log(`Missing keys (used in code, not in en locales): ${report.stats.missingInLocalesCount}`);
console.log(`Untranslated fa keys: ${report.stats.untranslatedFaCount}`);
console.log(`Untranslated ps keys: ${report.stats.untranslatedPsCount}`);
console.log(`Report written to locale-validation-report.json`);

const hasErrors =
  report.stats.parityErrorCount > 0 ||
  report.stats.missingInLocalesCount > 0;

// Warn on high untranslated counts but don't fail build for gradual improvement
if (report.stats.untranslatedFaCount > 50 || report.stats.untranslatedPsCount > 50) {
  console.warn(`Warning: ${report.stats.untranslatedFaCount} fa / ${report.stats.untranslatedPsCount} ps keys may still be untranslated`);
}

process.exit(hasErrors ? 1 : 0);
