import re
from pathlib import Path

schema = Path("db/schema.ts").read_text(encoding="utf-8")
sql = Path("db/init_schema.sql").read_text(encoding="utf-8")

# extract table definitions
pattern = r'export\s+const\s+(\w+)\s*=\s+mysqlTable\("([^"]+)"'
tables = re.findall(pattern, schema)
print(f"Schema tables: {len(tables)}")
missing = [name for _, name in tables if f"CREATE TABLE IF NOT EXISTS `{name}`" not in sql]
if missing:
    print("Missing in SQL:")
    for name in missing:
        print(" -", name)
else:
    print("All tables present in SQL.")

sql_tables = re.findall(r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`([^`]+)`', sql)
print(f"SQL tables: {len(sql_tables)}")
extra = [name for name in sql_tables if name not in {n for _, n in tables}]
if extra:
    print("Extra SQL tables:")
    for name in extra:
        print(" -", name)
else:
    print("No extra tables in SQL.")

# verify enum definitions exist in SQL
enum_pattern = r'mysqlEnum\("([^"]+)",\s*\[([^\]]+)\]\)'
enums = re.findall(enum_pattern, schema)
print(f"Enum defs: {len(enums)}")
for name, raw in enums:
    vals = re.findall(r'"([^"]+)"', raw)
    sql_pattern = "enum('" + "','".join(vals) + "')"
    if sql_pattern not in sql:
        print(f"Enum mismatch or not found for {name}: {vals}")
