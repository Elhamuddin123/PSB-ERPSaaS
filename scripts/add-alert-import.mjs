import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.(tsx?)$/.test(ent.name)) files.push(full);
  }
  return files;
}

const importLine = 'import { alertServerError } from "@/lib/i18n-ui";\n';

for (const file of walk(srcDir)) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("alertServerError")) continue;
  if (content.includes('from "@/lib/i18n-ui"')) continue;
  const idx = content.indexOf("\n", content.indexOf("import "));
  if (idx === -1) continue;
  content = content.slice(0, idx + 1) + importLine + content.slice(idx + 1);
  fs.writeFileSync(file, content);
  console.log("Added import to", path.relative(srcDir, file));
}
