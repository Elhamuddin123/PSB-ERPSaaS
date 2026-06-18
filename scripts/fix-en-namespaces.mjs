/**
 * Fix en namespace files: use src/en base + common.json snake_case lookups for extra keys
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public", "locales");
const SRC = path.join(ROOT, "src", "locales");
const NAMESPACES = [
  "login", "register", "dashboard", "sidebar", "admin",
  "tickets", "customers", "reports", "invoices",
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

function camelToSnake(s) {
  return s.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

function humanize(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function readJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const commonEn = flatten(readJson(path.join(PUBLIC, "en", "common.json")));

for (const ns of NAMESPACES) {
  const faFlat = flatten(readJson(path.join(PUBLIC, "fa", `${ns}.json`)));
  const srcEnFlat = flatten(readJson(path.join(SRC, "en", `${ns}.json`)));
  const pubEnFlat = flatten(readJson(path.join(PUBLIC, "en", `${ns}.json`)));
  const enOut = {};

  for (const key of Object.keys(faFlat)) {
    if (srcEnFlat[key] !== undefined) {
      enOut[key] = srcEnFlat[key];
    } else if (pubEnFlat[key] && !/[\u0600-\u06FF]/.test(String(pubEnFlat[key]))) {
      enOut[key] = pubEnFlat[key];
    } else {
      const snake = camelToSnake(key);
      const variants = [
        snake,
        `${snake}_1`,
        `${snake}_1_1`,
        snake.replace(/_/g, "_1_"),
      ];
      let found = undefined;
      for (const v of variants) {
        if (commonEn[v] !== undefined && !/[\u0600-\u06FF]/.test(String(commonEn[v]))) {
          found = commonEn[v];
          break;
        }
      }
      // Also try direct common key matches for known mappings
      const directMap = {
        title: ns === "tickets" ? commonEn.ticket_management : commonEn[`${ns}_title`],
        subtitle: commonEn.manage_airline_tickets_bookings_and_reservations,
        loadingTickets: commonEn.loading_tickets,
        errorLoadingTickets: commonEn.error_loading_tickets,
        failedToLoadTickets: commonEn.failed_to_load_tickets,
        singleTicket: commonEn.single_ticket,
        multipleTickets: commonEn.multiple_tickets,
        passengerInformation: commonEn.passenger_information,
        financialInformation: commonEn.financial_information,
        newTicket: commonEn.new_ticket,
        walkInNoCustomer: commonEn.walk_in_no_customer,
        recordTicketPayment: commonEn.record_ticket_payment,
        deleteTicketWarning: commonEn.delete_ticket_reverses_accounting_if_approved,
      };
      enOut[key] = found ?? directMap[key] ?? humanize(key);
    }
  }

  writeJson(path.join(PUBLIC, "en", `${ns}.json`), unflatten(enOut));
  console.log(`Fixed en/${ns}.json (${Object.keys(enOut).length} keys)`);
}

console.log("Done fixing en namespace files.");
