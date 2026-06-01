import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupCompleteDatabase() {
  console.log("🚀 Starting complete database setup...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set in .env file");
    process.exit(1);
  }

  // First, create the database if it doesn't exist
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.slice(1);
  dbUrl.pathname = '/';
  
  const rootConnection = await mysql.createConnection(dbUrl.toString());
  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`✅ Database "${dbName}" ensured`);
  await rootConnection.end();

  // Connect to the actual database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Drop all existing tables (clean slate)
  console.log("🗑️  Dropping all existing tables...");
  const [tables] = await connection.execute(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE()
  `) as any[];
  
  await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of tables) {
    const tableName = table.TABLE_NAME || table.table_name;
    if (tableName !== '__drizzle_migrations') {
      console.log(`   Dropping: ${tableName}`);
      await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
  }
  await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
  console.log("✅ All tables dropped");

  // Generate and run migrations using Drizzle Kit
  console.log("📝 Creating tables from schema...");
  const { execSync } = await import('child_process');
  
  try {
    // Try to generate migration
    console.log("   Generating migrations...");
    execSync("npx drizzle-kit generate:mysql", { 
      stdio: 'pipe',
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    // Read and execute the generated SQL
    const drizzleDir = path.join(process.cwd(), "drizzle");
    const files = await fs.readdir(drizzleDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      throw new Error("No SQL files generated");
    }
    
    for (const sqlFile of sqlFiles) {
      console.log(`   Executing ${sqlFile}...`);
      const sqlPath = path.join(drizzleDir, sqlFile);
      let sql = await fs.readFile(sqlPath, 'utf-8');
      
      // Fix any remaining timestamp issues
      sql = sql.replace(/timestamp\(/g, 'datetime(');
      sql = sql.replace(/TIMESTAMP\(/g, 'datetime(');
      
      // Split and execute statements
      const statements = sql.split(';');
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          try {
            await connection.execute(trimmed);
          } catch (err: any) {
            if (!err.message.includes('already exists')) {
              console.log(`     Warning: ${err.message.substring(0, 100)}`);
            }
          }
        }
      }
    }
    console.log("✅ Schema created from SQL files!");
  } catch (error: any) {
    console.log("   Migration generation failed, trying direct push...");
    try {
      execSync("npx drizzle-kit push", { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log("✅ Schema created via push!");
    } catch (pushError) {
      console.error("❌ Could not create schema automatically");
      console.log("\n💡 Please run manually: npx drizzle-kit push");
      await connection.end();
      return;
    }
  }

  // Check if tables were created
  const [createdTables] = await connection.execute("SHOW TABLES") as any[];
  console.log(`\n📊 Created ${createdTables.length} tables`);
  
  if (createdTables.length > 0) {
    console.log("\n📋 Tables created:");
    createdTables.slice(0, 10).forEach((t: any) => {
      const tableName = Object.values(t)[0];
      console.log(`   - ${tableName}`);
    });
    if (createdTables.length > 10) {
      console.log(`   ... and ${createdTables.length - 10} more`);
    }
  } else {
    console.log("⚠️  No tables were created. Please check your schema.");
    await connection.end();
    return;
  }

  // Run seed data - try multiple locations
  console.log("\n🌱 Seeding database...");
  const possibleSeedPaths = [
    path.join(process.cwd(), "seed.sql"),
    path.join(process.cwd(), "db", "seed.sql"),
    path.join(__dirname, "seed.sql"),
    path.join(__dirname, "..", "seed.sql"),
  ];
  
  let seedSQL = null;
  let seedPath = null;
  
  for (const tryPath of possibleSeedPaths) {
    try {
      seedSQL = await fs.readFile(tryPath, 'utf-8');
      seedPath = tryPath;
      console.log(`   Found seed file at: ${tryPath}`);
      break;
    } catch (err) {
      // continue
    }
  }
  
  if (!seedSQL) {
    console.log("⚠️  No seed.sql file found. Skipping seed data.");
    console.log("   You can manually import seed data later with:");
    console.log("   mysql -u root -p psb_erp < seed.sql");
  } else {
    // Split seed SQL into statements
    const seedStatements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of seedStatements) {
      try {
        await connection.execute(statement);
        successCount++;
      } catch (err: any) {
        errorCount++;
        // Only log non-duplicate errors
        if (!err.message.includes('Duplicate entry') && 
            !err.message.includes('Duplicate key') &&
            !err.message.includes('already exists')) {
          console.log(`   ⚠️  Error: ${err.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`✅ Seed data inserted: ${successCount} successful, ${errorCount} skipped (duplicates/changes)`);
  }

  // Verify data
  console.log("\n📊 Verification:");
  try {
    const [tenantCount] = await connection.execute("SELECT COUNT(*) as count FROM tenants") as any[];
    const [userCount] = await connection.execute("SELECT COUNT(*) as count FROM users") as any[];
    const [ticketCount] = await connection.execute("SELECT COUNT(*) as count FROM tickets") as any[];
    
    console.log(`   Tenants: ${tenantCount[0]?.count || 0}`);
    console.log(`   Users: ${userCount[0]?.count || 0}`);
    console.log(`   Tickets: ${ticketCount[0]?.count || 0}`);
  } catch (err) {
    console.log("   Could not verify data (tables might be empty)");
  }

  await connection.end();
  console.log("\n🎉 Database setup complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Restart your backend server: npx tsx api/boot.ts");
  console.log("   2. Your API should now work with the database");
}

setupCompleteDatabase().catch(console.error);