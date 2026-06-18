import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, "..", "src", "pages");

const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".tsx"));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  if (!content.includes('alert(err.message)')) continue;

  const usesTc = content.includes('const { t: tc } = useTranslation("common")');
  const usesTCommon = /useTranslation\("common"\)/.test(content);
  const alertFn = usesTc ? "tc" : "t";

  if (!content.includes("alertServerError")) {
    if (content.includes('from "@/lib/')) {
      content = content.replace(
        /(import .+ from "@\/lib\/[^"]+";?\n)/,
        `$1import { alertServerError } from "@/lib/i18n-ui";\n`
      );
    } else if (content.includes('from "react-i18next"')) {
      content = content.replace(
        /import { useTranslation } from "react-i18next";\n/,
        `import { useTranslation } from "react-i18next";\nimport { alertServerError } from "@/lib/i18n-ui";\n`
      );
    }
  }

  content = content.replace(
    /onError:\s*\(err\)\s*=>\s*alert\(err\.message\)/g,
    `onError: (err) => alertServerError(${alertFn}, err)`
  );
  content = content.replace(
    /alert\(err\.message\)/g,
    `alertServerError(${alertFn}, err)`
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Patched", file);
  }
}
