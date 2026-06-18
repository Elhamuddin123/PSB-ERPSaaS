/** Sync missing nested keys from en/common to fa/ps common (keeps existing translations). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public", "locales");

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

const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(PUBLIC, "en", "common.json"), "utf8")));

for (const lang of ["fa", "ps"]) {
  const flat = flatten(JSON.parse(fs.readFileSync(path.join(PUBLIC, lang, "common.json"), "utf8")));
  let added = 0;
  for (const [key, value] of Object.entries(enFlat)) {
    if (!(key in flat)) {
      flat[key] = value;
      added++;
    }
  }
  for (const key of Object.keys(flat)) {
    if (!(key in enFlat)) delete flat[key];
  }
  fs.writeFileSync(path.join(PUBLIC, lang, "common.json"), JSON.stringify(unflatten(flat), null, 2) + "\n");
  console.log(`${lang}/common.json: synced parity (${added} keys added from en)`);
}
