import { Pool, PoolConfig } from "pg";

const dbConfig: PoolConfig = {
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  database: process.env.DATABASE_NAME || "story_chain",
  user: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "",
  max: parseInt(process.env.DATABASE_POOL_MAX || "20"),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || "30000"),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || "5000"),
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : process.env.DATABASE_SSL === "true" || process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : process.env.DATABASE_SSL_REQUIRE === "true"
          ? { rejectUnauthorized: true }
          : false,
};

class DatabasePool {
  private static instance: Pool | null = null;

  static getInstance(): Pool {
    if (!this.instance) {
      this.instance = new Pool(dbConfig);

      this.instance.on("error", err => {
        console.error("Unexpected database error on idle client:", err);
      });

      this.instance.on("connect", () => {
        console.log("Database connected successfully");
      });
    }
    return this.instance;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.end();
      this.instance = null;
    }
  }
}

export const db = DatabasePool.getInstance();
export { DatabasePool };
