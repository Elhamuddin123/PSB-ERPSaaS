/**
 * One-time merge: consolidate src/locales into public/locales
 * - Merge fa/ps common.json translations from src into public
 * - Sync en common.json key structure from public (canonical)
 * - Add extra namespace keys from fa/ps into en namespace files
 * - Ensure key parity across en/fa/ps per namespace
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const SRC = path.join(ROOT, "src", "locales");
const LANGS = ["en", "fa", "ps"];
const NAMESPACES = [
  "common",
  "login",
  "register",
  "dashboard",
  "sidebar",
  "admin",
  "tickets",
  "customers",
  "reports",
  "invoices",
];

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

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function sortObjectDeep(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectDeep(obj[key]);
  }
  return sorted;
}

// Keys to add to common if missing (from plan)
const CRM_KEYS_EN = {
  balanced: "Balanced",
  tx_gap: "Transaction gap",
  coa_gap: "Chart of accounts gap",
  "crm.title": "CRM",
  "crm.subtitle": "Manage your customers",
  "crm.addCustomer": "Add Customer",
  "crm.firstName": "First Name",
  "crm.lastName": "Last Name",
  "crm.emailOptional": "Email (optional)",
  "crm.phone": "Phone",
  "crm.company": "Company",
  "crm.type": "Type",
  "crm.individual": "Individual",
  "crm.corporate": "Corporate",
  "crm.notes": "Notes",
  "crm.createCustomer": "Create Customer",
};

const CRM_KEYS_FA = {
  balanced: "متوازن",
  tx_gap: "شکاف تراکنش",
  coa_gap: "شکاف دفتر حساب",
  "crm.title": "مدیریت مشتریان",
  "crm.subtitle": "مشتریان خود را مدیریت کنید",
  "crm.addCustomer": "افزودن مشتری",
  "crm.firstName": "نام",
  "crm.lastName": "نام خانوادگی",
  "crm.emailOptional": "ایمیل (اختیاری)",
  "crm.phone": "تلفن",
  "crm.company": "شرکت",
  "crm.type": "نوع",
  "crm.individual": "شخصی",
  "crm.corporate": "شرکتی",
  "crm.notes": "یادداشت‌ها",
  "crm.createCustomer": "ایجاد مشتری",
};

const CRM_KEYS_PS = {
  balanced: "متعادل",
  tx_gap: "د معاملې تشه",
  coa_gap: "د حسابونو کتاب تشه",
  "crm.title": "د پیرودونکو مدیریت",
  "crm.subtitle": "خپل پیرودونکي اداره کړئ",
  "crm.addCustomer": "پیرودونکی اضافه کړئ",
  "crm.firstName": "نوم",
  "crm.lastName": "تخلص",
  "crm.emailOptional": "بریښنالیک (اختیاري)",
  "crm.phone": "تلیفون",
  "crm.company": "شرکت",
  "crm.type": "ډول",
  "crm.individual": "شخصي",
  "crm.corporate": "شرکتي",
  "crm.notes": "یادښتونه",
  "crm.createCustomer": "پیرودونکی جوړ کړئ",
};

const CRM_EXTRA = { en: CRM_KEYS_EN, fa: CRM_KEYS_FA, ps: CRM_KEYS_PS };

console.log("=== Phase 1: Merge locales ===\n");

// Step 1: Merge fa/ps common from src into public (src has better translations)
for (const lang of ["fa", "ps"]) {
  const srcCommon = readJson(path.join(SRC, lang, "common.json"));
  const pubCommon = readJson(path.join(PUBLIC, lang, "common.json"));
  if (!srcCommon) {
    console.warn(`Skip ${lang}/common.json - no src file`);
    continue;
  }
  const srcFlat = flatten(srcCommon);
  const pubFlat = flatten(pubCommon || {});
  const enFlat = flatten(readJson(path.join(PUBLIC, "en", "common.json")) || {});

  // Use en key set as canonical for common namespace
  const merged = { ...pubFlat };
  for (const key of Object.keys(enFlat)) {
    if (srcFlat[key] !== undefined && srcFlat[key] !== enFlat[key]) {
      merged[key] = srcFlat[key];
    } else if (pubFlat[key] !== undefined) {
      merged[key] = pubFlat[key];
    } else if (srcFlat[key] !== undefined) {
      merged[key] = srcFlat[key];
    } else {
      merged[key] = enFlat[key];
    }
  }

  // Add CRM keys
  Object.assign(merged, CRM_EXTRA[lang]);

  writeJson(path.join(PUBLIC, lang, "common.json"), sortObjectDeep(unflatten(merged)));
  console.log(`Merged ${lang}/common.json (${Object.keys(merged).length} keys)`);
}

// Ensure en has CRM keys too
{
  const enCommon = readJson(path.join(PUBLIC, "en", "common.json"));
  const enFlat = flatten(enCommon);
  Object.assign(enFlat, CRM_KEYS_EN);
  writeJson(path.join(PUBLIC, "en", "common.json"), sortObjectDeep(unflatten(enFlat)));
  console.log("Updated en/common.json with CRM keys");
}

// Step 2: For each non-common namespace, merge extra keys from fa/ps into en
for (const ns of NAMESPACES.filter((n) => n !== "common")) {
  const enFlat = flatten(readJson(path.join(PUBLIC, "en", `${ns}.json`)) || {});
  const faFlat = flatten(readJson(path.join(PUBLIC, "fa", `${ns}.json`)) || {});
  const psFlat = flatten(readJson(path.join(PUBLIC, "ps", `${ns}.json`)) || {});

  const allKeys = new Set([...Object.keys(enFlat), ...Object.keys(faFlat), ...Object.keys(psFlat)]);

  for (const key of allKeys) {
    if (!(key in enFlat)) {
      // Use fa value as placeholder - will need English; try src en first
      const srcEn = flatten(readJson(path.join(SRC, "en", `${ns}.json`)) || {});
      enFlat[key] = srcEn[key] ?? faFlat[key] ?? psFlat[key] ?? key;
    }
    if (!(key in faFlat)) {
      const srcFa = flatten(readJson(path.join(SRC, "fa", `${ns}.json`)) || {});
      faFlat[key] = srcFa[key] ?? enFlat[key];
    }
    if (!(key in psFlat)) {
      const srcPs = flatten(readJson(path.join(SRC, "ps", `${ns}.json`)) || {});
      psFlat[key] = srcPs[key] ?? enFlat[key];
    }
  }

  for (const lang of LANGS) {
    const flat = lang === "en" ? enFlat : lang === "fa" ? faFlat : psFlat;
    writeJson(path.join(PUBLIC, lang, `${ns}.json`), sortObjectDeep(unflatten(flat)));
  }
  console.log(`Synced namespace ${ns} (${allKeys.size} keys)`);
}

// Step 3: Final parity pass on common - all langs get same keys as en
{
  const enFlat = flatten(readJson(path.join(PUBLIC, "en", "common.json")));
  for (const lang of ["fa", "ps"]) {
    const flat = flatten(readJson(path.join(PUBLIC, lang, "common.json")));
    for (const key of Object.keys(enFlat)) {
      if (!(key in flat)) flat[key] = enFlat[key];
    }
    // Remove keys not in en
    for (const key of Object.keys(flat)) {
      if (!(key in enFlat)) delete flat[key];
    }
    writeJson(path.join(PUBLIC, lang, "common.json"), sortObjectDeep(unflatten(flat)));
  }
}

console.log("\n=== Parity report ===");
let errors = 0;
for (const ns of NAMESPACES) {
  const sets = LANGS.map((l) => new Set(Object.keys(flatten(readJson(path.join(PUBLIC, l, `${ns}.json`)) || {}))));
  const enKeys = sets[0];
  for (let i = 1; i < sets.length; i++) {
    const missing = [...enKeys].filter((k) => !sets[i].has(k));
    const extra = [...sets[i]].filter((k) => !enKeys.has(k));
    if (missing.length || extra.length) {
      console.error(`${ns} ${LANGS[i]}: missing=${missing.length}, extra=${extra.length}`);
      errors++;
    }
  }
}
console.log(errors ? `Parity errors: ${errors}` : "All namespaces have key parity across en/fa/ps");
console.log("\nDone. Review public/locales before deleting src/locales.");
