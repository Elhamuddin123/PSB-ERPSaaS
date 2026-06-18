/**
 * Propagate fa/ps translations from canonical stem keys to numbered duplicates.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const LANGS = ["fa", "ps"];
const NAMESPACES = [
  "common", "login", "register", "dashboard", "sidebar", "admin",
  "tickets", "customers", "reports", "invoices",
];

const STEMS = [
  "amount", "balance", "date", "description", "customer", "status", "notes",
  "paid", "retry", "vendor", "total", "title", "category", "count", "payment",
  "receipt", "code", "account", "type", "debit", "credit", "commission",
  "discount", "tax", "wallet", "airline", "route", "passenger", "previous",
  "next", "pdf", "csv", "detail", "summary", "revenue", "expense",
];

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

function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] ?? {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}

function stemFor(key) {
  for (const stem of STEMS) {
    if (key === stem || key.startsWith(`${stem}_`)) return stem;
  }
  return null;
}

function canonicalValue(flat, stem) {
  if (flat[stem] && flat[stem] !== flat[`${stem}_1`]) return flat[stem];
  return flat[stem] || flat[`${stem}_1`] || flat[`${stem}_1_1`];
}

let updated = 0;

for (const ns of NAMESPACES) {
  const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(PUBLIC, "en", `${ns}.json`), "utf8")));
  for (const lang of LANGS) {
    const filePath = path.join(PUBLIC, lang, `${ns}.json`);
    const flat = flatten(JSON.parse(fs.readFileSync(filePath, "utf8")));
    for (const key of Object.keys(flat)) {
      if (flat[key] !== enFlat[key]) continue;
      const stem = stemFor(key);
      if (!stem) continue;
      const canonical = canonicalValue(flat, stem);
      if (!canonical || canonical === enFlat[key]) continue;
      flat[key] = canonical;
      updated++;
    }
    fs.writeFileSync(filePath, JSON.stringify(unflatten(flat), null, 2) + "\n");
  }
}

console.log(`Synced ${updated} duplicate translation values in fa/ps.`);
