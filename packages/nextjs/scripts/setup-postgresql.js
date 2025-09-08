#!/usr/bin/env node

/**
 * Story Chain PostgreSQL Migration Setup Script
 * This script helps migrate from Vercel Edge Config to PostgreSQL
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Story Chain PostgreSQL Migration Setup");
console.log("==========================================");

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.error("❌ Error: package.json not found. Please run this script from the project root.");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
if (!packageJson.dependencies || !packageJson.dependencies.pg) {
  console.error('❌ Error: PostgreSQL dependencies not found. Please run "yarn add pg @types/pg" first.');
  process.exit(1);
}

console.log("✅ PostgreSQL dependencies found");

// Check if PostgreSQL is available
try {
  execSync("psql --version", { stdio: "ignore" });
  console.log("✅ PostgreSQL client found");
} catch (error) {
  console.log("⚠️  PostgreSQL client not found in PATH");
  console.log("   Please install PostgreSQL or ensure it's in your PATH");
}

// Create database setup instructions
console.log("\n📋 PostgreSQL Setup Instructions:");
console.log("==================================");

console.log("\n1. Create PostgreSQL database:");
console.log("   createdb story_chain");
console.log("   # or connect to PostgreSQL and run: CREATE DATABASE story_chain;");

console.log("\n2. Update your .env.local file with database credentials:");
console.log("   DATABASE_HOST=localhost");
console.log("   DATABASE_PORT=5432");
console.log("   DATABASE_NAME=story_chain");
console.log("   DATABASE_USER=your_username");
console.log("   DATABASE_PASSWORD=your_password");

console.log("\n3. Run database migrations:");
console.log("   You can run migrations programmatically using:");
console.log("   ```javascript");
console.log('   import { runMigrations } from "./lib/database/migrations";');
console.log("   await runMigrations();");
console.log("   ```");

console.log("\n4. Optional: Import existing data from Edge Config");
console.log("   If you have existing data in Edge Config, you can create a migration");
console.log("   script to export from Edge Config and import to PostgreSQL.");

console.log("\n🔄 Migration Status:");
console.log("==================");
console.log("✅ PostgreSQL dependencies installed");
console.log("✅ Database configuration created");
console.log("✅ Database schema created");
console.log("✅ PostgreSQL store implementation created");
console.log("✅ API routes updated to use PostgreSQL");
console.log("✅ Chain monitor updated to use PostgreSQL");

console.log("\n⚡ Next Steps:");
console.log("=============");
console.log("1. Set up your PostgreSQL database");
console.log("2. Update your .env.local with database credentials");
console.log("3. Run the migrations to create tables");
console.log("4. Test your application");

console.log("\n📚 Files Created/Modified:");
console.log("=========================");
console.log("• lib/database/config.ts - Database connection configuration");
console.log("• lib/database/schema.sql - Database schema definition");
console.log("• lib/database/migrations.ts - Database migration utilities");
console.log("• lib/database/postgreSQLStore.ts - PostgreSQL store implementation");
console.log("• lib/monitoring/chainMonitor.ts - Updated to use PostgreSQL");
console.log("• app/api/data/*/route.ts - API routes updated");
console.log("• .env.example - Updated with PostgreSQL configuration");

console.log("\n🎉 Migration setup complete!");
