/**
 * Remove garbage locale keys (code fragments, unused numbered duplicates) and fix placeholder strings.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const SRC = path.join(ROOT, "src");
const LANGS = ["en", "fa", "ps"];
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

function walkDir(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "locales") walkDir(full, files);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(full);
  }
  return files;
}

function collectUsedKeys() {
  const used = new Set();
  const tKeyPattern = /(?:^|[^\w])(?:t|tc)\(\s*["']([a-zA-Z0-9_.]+)["']/g;
  const nsPattern = /useTranslation\(\s*(?:\[([^\]]+)\]|["']([^"']+)["'])/g;

  for (const file of walkDir(SRC)) {
    const content = fs.readFileSync(file, "utf8");
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

    for (const m of content.matchAll(tKeyPattern)) {
      const key = m[1];
      const isTc = content.slice(Math.max(0, m.index - 3), m.index).includes("tc");
      const ns = isTc ? "common" : defaultNs;
      used.add(`${ns}:${key}`);
      // also mark key in any namespace that has it (for duplicate detection)
      for (const n of NAMESPACES) used.add(`${n}:${key}`);
    }
  }
  return used;
}

function isCodeFragment(value) {
  return /&&|!==|\?\?|\) :|\.status|\.length|invoiceDetail|expenseDetail|incomeStatementData|fieldPath|canResetAgency|MIN_WIDTH/i.test(value);
}

function isGarbageKey(key) {
  if (/^\d/.test(key)) return true;
  if (/^(expensedetail|incomestatementdata|items_length|fieldpath|canresetagency|min_width|i_1|l_accountid)$/i.test(key)) return true;
  if (/^psb_erp_\d/i.test(key)) return true;
  if (/^variantprops/i.test(key)) return true;
  if (/^(amount|description|error|total|vendor|customer|account|code|retry|previous|next|pdf|detail|summary|title|date|status|payment|receipt|category|count)_[\d_]+$/i.test(key)) {
    return true;
  }
  return false;
}

const EN_FIXES = {
  goToLogin: "Go to Login",
  invalidCredentials: "Invalid credentials",
  "home.howItWorksBadge": "How It Works",
  "home.howItWorksHeadline": "Get started in three simple steps",
};

const FA_FIXES = {
  "home.howItWorksBadge": "نحوه کار",
  "home.howItWorksHeadline": "در سه مرحله ساده شروع کنید",
};

const PS_FIXES = {
  "home.howItWorksBadge": "څنګه کار کوي",
  "home.howItWorksHeadline": "په درې ساده ګامونو کې پیل وکړئ",
};

const usedKeys = collectUsedKeys();
let removed = 0;
let fixed = 0;

for (const lang of LANGS) {
  const fixes = lang === "en" ? EN_FIXES : lang === "fa" ? FA_FIXES : PS_FIXES;
  for (const ns of NAMESPACES) {
    const filePath = path.join(PUBLIC, lang, `${ns}.json`);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const flat = flatten(raw);
    const next = {};

    for (const [key, value] of Object.entries(flat)) {
      if (fixes[key]) {
        next[key] = fixes[key];
        fixed++;
        continue;
      }
      if (isCodeFragment(value)) {
        removed++;
        continue;
      }
      if (isGarbageKey(key) && !usedKeys.has(`${ns}:${key}`)) {
        removed++;
        continue;
      }
      next[key] = value;
    }

    fs.writeFileSync(filePath, JSON.stringify(unflatten(next), null, 2) + "\n");
  }
}

console.log(`Cleaned locale files: removed ${removed} garbage keys, fixed ${fixed} placeholder values.`);
