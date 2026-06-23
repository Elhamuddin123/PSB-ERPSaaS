/**
 * Copy keys present in en but missing in fa/ps (English fallback for parity).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public", "locales");
const LANGS = ["fa", "ps"];
const NAMESPACES = [
  "common", "login", "register", "dashboard", "sidebar", "admin",
  "tickets", "customers", "reports", "invoices",
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

let added = 0;

for (const ns of NAMESPACES) {
  const enPath = path.join(PUBLIC, "en", `${ns}.json`);
  if (!fs.existsSync(enPath)) continue;
  const enFlat = flatten(JSON.parse(fs.readFileSync(enPath, "utf8")));

  for (const lang of LANGS) {
    const filePath = path.join(PUBLIC, lang, `${ns}.json`);
    if (!fs.existsSync(filePath)) continue;
    const flat = flatten(JSON.parse(fs.readFileSync(filePath, "utf8")));
    for (const [key, value] of Object.entries(enFlat)) {
      if (!(key in flat)) {
        flat[key] = value;
        added++;
      }
    }
    fs.writeFileSync(filePath, `${JSON.stringify(unflatten(flat), null, 2)}\n`);
  }
}

console.log(`Backfilled ${added} missing locale keys in fa/ps from en.`);
