/**
 * Detect and fix locale values that are camelCase/snake_case keys
 * converted to a single capitalized word (no spaces).
 *
 * Usage:
 *   node scripts/fix-locale-label-format.mjs              # audit only
 *   node scripts/fix-locale-label-format.mjs --write      # apply all fixes
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const LANGS = ["en", "fa", "ps"];
const NAMESPACES = [
  "common", "login", "register", "dashboard", "sidebar", "admin",
  "tickets", "customers", "reports", "invoices",
];

const ACRONYMS = new Set([
  "pdf", "csv", "pnr", "vip", "api", "erp", "psb", "id", "url", "sms", "otp",
  "usd", "eur", "gbp", "afn", "jfk", "lhr", "kyc", "crm", "pos", "je", "sla",
]);

const PROTECTED_VALUES = new Set([
  "of", "months", "PSB ERP", "ERP", "PNR", "JFK", "LHR", "ABC123",
]);

/** Context-aware overrides — namespace.lang.dotPath */
const MANUAL = {
  common: {
    en: {
      accountsPayable: "Accounts Payable",
      addressPlaceholder: "Enter address",
      adminDemo: "Admin Demo",
      agencyName: "Agency Name",
      agencyNamePlaceholder: "Enter agency name",
      agencyRequests: "Agency Requests",
      agentDemo: "Agent Demo",
      allStatuses: "All Statuses",
      approvalSuccess: "Request approved successfully",
      bankRecon: "Bank Reconciliation",
      billNumber: "Bill Number",
      cashLoans: "Cash Loans",
      cityPlaceholder: "Enter city",
      confirmApprove: "Approve agency?",
      confirmReject: "Reject agency?",
      copyToken: "Copy Token",
      demoAccounts: "Demo Accounts",
      depositCode: "Deposit Code",
      depositManagement: "Deposit Management",
      depositMethod: "Deposit Method",
      downloadToken: "Download Token",
      duplicateAgency: "This agency name is already registered",
      duplicateEmail: "This email is already registered",
      emailLabel: "Email",
      emailPlaceholder: "Enter email address",
      exchangeRates: "Exchange Rates",
      expensesByCategory: "Expenses by Category",
      generateDocumentsDescription: "Generate documents to get started.",
      hidePassword: "Hide password",
      invoiceNumber: "Invoice Number",
      issueDate: "Issue Date",
      loanDate: "Loan Date",
      loanNumber: "Loan Number",
      manageDocuments: "Manage Documents",
      manageSupplierBills: "Manage Supplier Bills",
      markAllRead: "Mark all as read",
      noAccount: "Don't have an account?",
      noDocumentsYet: "No documents yet",
      noNotifications: "No notifications",
      noPayableData: "No payable data available",
      noRecordsFound: "No records found",
      officeAddress: "Office Address",
      officeEmail: "Email",
      officeInfo: "Office Information",
      officePhone: "Phone",
      overviewDescription: "Overview of your travel agency operations",
      ownerName: "Owner Name",
      ownerNamePlaceholder: "Enter owner's full name",
      passwordHint: "At least 8 characters",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      signInButton: "Sign In",
      signingIn: "Signing in...",
      statusActive: "Active",
      statusPending: "Pending",
      "common.signIn": "Sign In",
      "paymentActivation.title": "Payment & Activation",
      "paymentActivation.subtitle":
        "Complete your payment at our office to activate your subscription.",
      "paymentActivation.subscriptionStatus": "Subscription Status",
      "paymentActivation.currentStatus": "Current Status",
      "paymentActivation.selectedPlan": "Selected Plan",
      "paymentActivation.duration": "Duration",
      "paymentActivation.registrationCode": "Registration Code",
      "paymentActivation.expires": "Expires",
      "paymentActivation.officePaymentInfo": "Office Payment Information",
      "paymentActivation.activationSteps": "Activation Steps",
      "paymentActivation.step1": "Note your registration code shown above.",
      "paymentActivation.step2": "Visit our office with your payment amount.",
      "paymentActivation.step3": "Complete payment at the office.",
      "paymentActivation.step4": "Our team verifies your payment (within 1 business day).",
      "paymentActivation.step5": "Sign in to access your dashboard once activated.",
      "paymentActivation.goToDashboard": "Go to Dashboard",
      "paymentActivation.needHelp": "Need help? Contact us at {{email}}",
      "progressTimeline.0.label": "Registration submitted",
      "progressTimeline.1.label": "Payment verification",
      "progressTimeline.2.label": "Account activation",
    },
    fa: {
      addressPlaceholder: "آدرس را وارد کنید",
      agencyNamePlaceholder: "نام آژانس خود را وارد کنید",
      cityPlaceholder: "نام شهر را وارد کنید",
      confirmApprove: "آژانس تأیید شود؟",
      confirmReject: "آژانس رد شود؟",
      emailLabel: "ایمیل",
      emailPlaceholder: "آدرس ایمیل را وارد کنید",
      ownerNamePlaceholder: "نام کامل مالک را وارد کنید",
      passwordHint: "حداقل ۸ کاراکتر",
      passwordLabel: "رمز عبور",
      passwordPlaceholder: "رمز عبور را وارد کنید",
      phonePlaceholder: "شماره تلفن را وارد کنید",
      searchPlaceholder: "جستجو...",
      signInButton: "ورود",
      "common.signIn": "ورود",
      "paymentActivation.title": "پرداخت و فعال‌سازی",
      "paymentActivation.subtitle":
        "برای فعال‌سازی اشتراک خود، پرداخت را در دفتر ما تکمیل کنید.",
      "paymentActivation.step1": "کد ثبت‌نام نمایش‌داده‌شده در بالا را یادداشت کنید.",
      "paymentActivation.step2": "با مبلغ پرداخت به دفتر ما مراجعه کنید.",
      "paymentActivation.step3": "پرداخت را در دفتر تکمیل کنید.",
      "paymentActivation.step4": "تیم ما پرداخت را تأیید می‌کند (حداکثر یک روز کاری).",
      "paymentActivation.step5": "پس از فعال‌سازی، برای دسترسی به داشبورد وارد شوید.",
      "paymentActivation.needHelp": "نیاز به راهنمایی دارید؟ با {{email}} تماس بگیرید.",
      "progressTimeline.0.label": "ثبت‌نام ارسال شد",
      "progressTimeline.1.label": "تأیید پرداخت",
      "progressTimeline.2.label": "فعال‌سازی حساب",
    },
    ps: {
      addressPlaceholder: "آدرس دننه کړئ",
      agencyNamePlaceholder: "د خپلې ادارې نوم دننه کړئ",
      cityPlaceholder: "د ښار نوم دننه کړئ",
      confirmApprove: "اداره تایید شي؟",
      confirmReject: "اداره رد شي؟",
      emailLabel: "برېښنالیک",
      emailPlaceholder: "برېښنالیک آدرس دننه کړئ",
      ownerNamePlaceholder: "د مالک بشپړ نوم دننه کړئ",
      passwordHint: "لږ تر لږه ۸ توري",
      passwordLabel: "پټنوم",
      passwordPlaceholder: "پټنوم دننه کړئ",
      phonePlaceholder: "د تلیفون شمېره دننه کړئ",
      searchPlaceholder: "لټون...",
      signInButton: "ننوتل",
      "common.signIn": "ننوتل",
      "paymentActivation.title": "تادیه او فعالول",
      "paymentActivation.subtitle":
        "د خپل ګډون د فعالولو لپاره زموږ دفتر کې تادیه بشپړه کړئ.",
      "paymentActivation.step1": "پورته ښودل شوی د ثبت کوډ یاد ولیکئ.",
      "paymentActivation.step2": "د تادیې مبلغ سره زموږ دفتر ته راشئ.",
      "paymentActivation.step3": "په دفتر کې تادیه بشپړه کړئ.",
      "paymentActivation.step4": "زموږ ټیم تادیه تاییدوي (تر یوې کاري ورځې پورې).",
      "paymentActivation.step5": "په فعالولو وروسته د ډشبورډ لاسرسي لپاره ننوځئ.",
      "paymentActivation.needHelp": "مرستې ته اړتیا لرئ؟ له {{email}} سره اړیکه ونیسئ.",
      "progressTimeline.0.label": "ثبت نام وسپارل شو",
      "progressTimeline.1.label": "د تادیې تایید",
      "progressTimeline.2.label": "د حساب فعالول",
    },
  },
  sidebar: {
    en: {
      bankRecon: "Bank Reconciliation",
      markAllRead: "Mark all as read",
    },
  },
  reports: {
    en: {
      detailCSV: "Detail CSV",
      exportCSV: "Export CSV",
      pdfExport: "PDF Export",
      summaryCSV: "Summary CSV",
    },
  },
  invoices: {
    en: {
      downloadPDF: "Download PDF",
    },
  },
  tickets: {
    en: {
      statusPending: "Pending",
    },
  },
};

const PROTECTED_KEYS = new Set([
  "je_2026_xxx", "psb_erp", "officeEmail",
  "1_30_days", "31_60_days", "61_90_days", "over_90", "min_8_characters",
  "over", "bill", "invoice", "ticket", "receipt", "phonePlaceholder",
]);

function keyToWords(key) {
  const leaf = key.includes(".") ? key.split(".").pop() : key;
  const normalized = leaf.replace(/_/g, "-");
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .split(/[-_]+/)
    .filter(Boolean);
}

function titleWord(word) {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function keyToEnglishLabel(key) {
  return keyToWords(key).map(titleWord).join(" ");
}

function normalize(str) {
  return str.toLowerCase().replace(/[\s_\-./]+/g, "");
}

function isMalformedLabel(key, value) {
  if (!value || typeof value !== "string") return false;
  const leaf = key.includes(".") ? key.split(".").pop() : key;
  if (PROTECTED_KEYS.has(leaf) || PROTECTED_KEYS.has(key)) return false;
  if (PROTECTED_VALUES.has(value)) return false;

  const trimmed = value.trim();
  if (/\{\{/.test(trimmed)) return false;
  if (/@/.test(trimmed) && trimmed.includes(".")) return false;
  if (/^[\d\s$.,:+\-()%@#]+$/.test(trimmed)) return false;
  if (/^\+?\d[\d\s\-()]+$/.test(trimmed)) return false;

  const core = trimmed.replace(/[*:.,!?]+$/, "").trim();
  if (!core) return false;

  // Prefix-stuffed values like "Paymentactivation Activationsteps"
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(core)) {
    const parts = core.split(/\s+/);
    if (parts.length === 2 && normalize(parts[0]).includes(normalize(parts[1]))) {
      return true;
    }
  }

  if (/\s/.test(core)) {
    const words = core.split(/\s+/);
    // Proper sentence — not a key concat with spaces inserted
    if (words.length > 1 && /^[a-z(]/.test(words[1])) return false;
    if (leaf.includes("_")) return false;

    const leafNorm = normalize(leaf);
    const valNorm = normalize(core);
    if (valNorm === leafNorm) return true;
    if (words.length >= 2 && normalize(words[0]) === leafNorm) return true;
    return false;
  }

  // snake_case keys with intentional spaced values handled above; single-token only below
  const keyNorm = normalize(leaf);
  const valNorm = normalize(core);
  if (keyNorm !== valNorm) return false;

  const parts = keyToWords(key);
  if (parts.length < 2 && !leaf.includes("_")) {
    if (parts.length === 1 && parts[0].length <= 4) return false;
  }
  return parts.length >= 2 || leaf.includes("_");
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
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {};
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
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

function sortDeep(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = sortDeep(obj[k]);
  }
  return sorted;
}

const write = process.argv.includes("--write");
const jsonOnly = process.argv.includes("--json");
const report = { fixes: {}, totals: { en: 0, fa: 0, ps: 0 }, examples: [] };

for (const ns of NAMESPACES) {
  report.fixes[ns] = { en: [], fa: [], ps: [] };

  for (const lang of LANGS) {
    const filePath = path.join(PUBLIC, lang, `${ns}.json`);
    if (!fs.existsSync(filePath)) continue;

    const data = readJson(filePath);
    const flat = flatten(data);
    const manual = MANUAL[ns]?.[lang] ?? {};
    let changed = false;

    for (const [key, value] of Object.entries(flat)) {
      if (typeof value !== "string") continue;

      let newVal = manual[key];
      if (!newVal && lang === "en" && isMalformedLabel(key, value)) {
        const leaf = key.includes(".") ? key.split(".").pop() : key;
        if (!leaf.includes("_")) {
          newVal = keyToEnglishLabel(leaf);
        }
      }

      if (!newVal || newVal === value) continue;

      // Protect labels with # suffix, acronyms, example phones
      if (/[#]$/.test(value.trim())) continue;
      if (/\bSLA\b/.test(value)) continue;
      if (/^\+?\d[\d\s\-()]+$/.test(value.trim()) && key.includes("phone")) continue;

      flat[key] = newVal;
      changed = true;
      report.fixes[ns][lang].push({ key, old: value, new: newVal });
      report.totals[lang]++;

      if (report.examples.length < 20) {
        report.examples.push({ ns, lang, key, old: value, new: newVal });
      }
    }

    if (changed && write) {
      writeJson(filePath, sortDeep(unflatten(flat)));
    }
  }
}

const outReport = path.join(ROOT, "locale-label-fix-report.json");
fs.writeFileSync(outReport, JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(report, null, 2));
if (!jsonOnly) {
  console.log("\n--- Summary ---");
  console.log(`Fixed EN: ${report.totals.en}`);
  console.log(`Fixed FA: ${report.totals.fa}`);
  console.log(`Fixed PS: ${report.totals.ps}`);
  if (!write) console.log("\n(Dry run — pass --write to apply)");
}
