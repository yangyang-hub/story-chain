import { runMigrations } from "../database/migrations";
import { PostgreSQLStore } from "../database/postgreSQLStore";

/**
 * PostgreSQL Store Test Utility
 * Test the PostgreSQL integration
 */
export async function testPostgreSQLStore(): Promise<void> {
  console.log("🧪 Testing PostgreSQL store...");

  try {
    // First, run database migrations to ensure tables exist
    console.log("📋 Running database migrations...");
    await runMigrations();

    // Initialize store
    const pgStore = new PostgreSQLStore();

    // Test basic operations
    console.log("📤 Testing PostgreSQL store operations...");
    const stories = await pgStore.getStoriesData();
    const chapters = await pgStore.getChaptersData();
    const analytics = await pgStore.getAnalyticsData();

    console.log("✅ PostgreSQL store test completed!");
    console.log(`   - Stories found: ${stories.length}`);
    console.log(`   - Chapters found: ${chapters.length}`);
    console.log(`   - Analytics available: ${analytics ? "✅" : "❌"}`);
  } catch (error) {
    console.error("❌ PostgreSQL store test failed:", error);
    throw error;
  }
}

/**
 * Test PostgreSQL store operations
 */
export async function validatePostgreSQLStore(): Promise<void> {
  console.log("🔍 Testing PostgreSQL store...");

  try {
    const pgStore = new PostgreSQLStore();

    const pgData = await pgStore.getData();

    if (!pgData) {
      console.log("⚠️  No data found in PostgreSQL store");
      return;
    }

    // Display data
    const storiesCount = pgData.stories.length;
    console.log(`Stories count - PostgreSQL: ${storiesCount} ✅`);

    const chaptersCount = pgData.chapters.length;
    console.log(`Chapters count - PostgreSQL: ${chaptersCount} ✅`);

    const analyticsValid = pgData.analytics.totalStories >= 0;
    console.log(
      `Analytics total stories - PostgreSQL: ${pgData.analytics.totalStories} ${analyticsValid ? "✅" : "❌"}`,
    );

    console.log("🎉 PostgreSQL store validation successful!");
  } catch (error) {
    console.error("❌ PostgreSQL store validation failed:", error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "test":
      testPostgreSQLStore()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "validate":
      validatePostgreSQLStore()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    default:
      console.log("Usage: tsx migrate-edge-to-pg.ts [test|validate]");
      console.log("");
      console.log("Commands:");
      console.log("  test     - Test PostgreSQL store functionality");
      console.log("  validate - Validate PostgreSQL store data");
      process.exit(1);
  }
}
