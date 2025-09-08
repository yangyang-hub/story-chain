import { db } from "./config";
import { readFileSync } from "fs";
import { join } from "path";

export async function runMigrations(): Promise<void> {
  try {
    console.log("Running database migrations...");

    const schemaPath = join(__dirname, "schema.sql");
    const schemaSql = readFileSync(schemaPath, "utf8");

    await db.query(schemaSql);

    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await db.query("SELECT 1 as connected");
    return result.rows.length > 0;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
