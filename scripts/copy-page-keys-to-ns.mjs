/**
 * Copy translation keys used by a page from common.json into a dedicated namespace.
 * Usage: node scripts/copy-page-keys-to-ns.mjs <page.tsx> <namespace>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const LANGS = ["en", "fa", "ps"];

const pageFile = process.argv[2];
const namespace = process.argv[3];
if (!pageFile || !namespace) {
  console.error("Usage: node copy-page-keys-to-ns.mjs <page.tsx> <namespace>");
  process.exit(1);
}

const code = fs.readFileSync(path.resolve(ROOT, pageFile), "utf8");
const keyPatterns = [
  /\bt\(\s*["']([^"']+)["']/g,
  /\btc\(\s*["']([^"']+)["']/g,
];
const keys = new Set();
for (const re of keyPatterns) {
  for (const m of code.matchAll(re)) keys.add(m[1]);
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
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
      if (!(parts[i] in cur)) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

for (const lang of LANGS) {
  const nsPath = path.join(PUBLIC, lang, `${namespace}.json`);
  const commonFlat = flatten(readJson(path.join(PUBLIC, lang, "common.json")));
  const nsFlat = flatten(readJson(nsPath));
  let copied = 0;
  for (const key of keys) {
    if (commonFlat[key] !== undefined && nsFlat[key] === undefined) {
      nsFlat[key] = commonFlat[key];
      copied++;
    }
  }
  writeJson(nsPath, unflatten(nsFlat));
  console.log(`${lang}/${namespace}.json: copied ${copied} keys from common (${Object.keys(nsFlat).length} total)`);
}

console.log(`Keys referenced in ${pageFile}: ${keys.size}`);
