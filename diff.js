const fs = require('fs');
const schema = fs.readFileSync('db/schema.ts','utf8');
const sql = fs.readFileSync('u234037744_psb_erp.sql','utf8');
const blocks = [...schema.matchAll(/mysqlTable\("([^\"]+)"\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\(|\))/g)];
const tableCols = {};
for (const m of blocks) {
  const name = m[1];
  const body = m[2];
  const cols = [...body.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*[A-Za-z]/gm)].map(x => x[1]);
  tableCols[name] = cols;
}
const sqlTables = {};
for (const m of [...sql.matchAll(/CREATE TABLE `([^`]+)` \(([^;]*?)\) ENGINE=/gs)]) {
  const name = m[1];
  const body = m[2];
  const cols = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    const cm = trimmed.match(/^`([^`]+)`\s+/);
    if (cm) cols.push(cm[1]);
  }
  sqlTables[name] = cols;
}
const missing = {};
for (const [tbl, cols] of Object.entries(tableCols)) {
  const sqlCols = sqlTables[tbl] || [];
  const missingCols = cols.filter(c => !sqlCols.includes(c));
  const extraCols = sqlCols.filter(c => !cols.includes(c) && c !== 'id');
  if (missingCols.length || extraCols.length) missing[tbl] = { missingCols, extraCols };
}
const out = [];
out.push('TABLES_IN_SCHEMA ' + Object.keys(tableCols).length);
out.push('TABLES_IN_SQL ' + Object.keys(sqlTables).length);
for (const tbl of Object.keys(missing).sort()) {
  const { missingCols, extraCols } = missing[tbl];
  if (missingCols.length) out.push(`${tbl}: MISSING ${missingCols.join(', ')}`);
  if (extraCols.length) out.push(`${tbl}: EXTRA ${extraCols.join(', ')}`);
}
fs.writeFileSync('schema_diff.txt', out.join('\n'));
