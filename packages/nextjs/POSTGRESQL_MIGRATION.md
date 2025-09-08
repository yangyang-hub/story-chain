# PostgreSQL Migration Guide

This document explains how to migrate from Vercel Edge Config to PostgreSQL for storing on-chain event data.

## Overview

The Story Chain application has been migrated from using Vercel Edge Config to PostgreSQL for better performance, scalability, and data management capabilities.

## Migration Benefits

- ✅ **Better Performance**: Direct SQL queries instead of HTTP API calls
- ✅ **Scalability**: Handle larger datasets without Edge Config size limits
- ✅ **Rich Querying**: Support for complex SQL queries, filtering, and aggregations
- ✅ **Reliability**: Better error handling and connection management
- ✅ **Cost Effective**: No Edge Config API call limits
- ✅ **Data Integrity**: ACID transactions and foreign key constraints

## Files Modified

### Database Layer

- `lib/database/config.ts` - PostgreSQL connection configuration
- `lib/database/schema.sql` - Database schema definition
- `lib/database/migrations.ts` - Migration utilities
- `lib/database/postgreSQLStore.ts` - PostgreSQL store implementation
- `lib/database/migrate-edge-to-pg.ts` - Edge Config to PostgreSQL migration utility

### Application Layer

- `lib/monitoring/chainMonitor.ts` - Updated to use PostgreSQL store
- `app/api/data/stories/route.ts` - Updated API route
- `app/api/data/chapters/route.ts` - Updated API route
- `app/api/data/analytics/route.ts` - Updated API route

### Configuration

- `.env.example` - Updated with PostgreSQL configuration
- `package.json` - Added PostgreSQL dependencies (`pg`, `@types/pg`)

## Setup Instructions

### 1. Install Dependencies

Dependencies are already added to package.json. Just run:

```bash
yarn install
```

### 2. Set up PostgreSQL Database

Create a PostgreSQL database:

```bash
# Using createdb command
createdb story_chain

# Or connect to PostgreSQL and run:
# CREATE DATABASE story_chain;
```

### 3. Configure Environment Variables

Update your `.env.local` file:

```env
# PostgreSQL Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=story_chain
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=5000
```

### 4. Run Database Migrations

Create the database tables:

```typescript
// In your application startup or migration script
import { runMigrations } from "./lib/database/migrations";

await runMigrations();
```

Or run the migration utility:

```bash
npx tsx lib/database/migrate-edge-to-pg.ts migrate
```

### 5. Migrate Existing Data (Optional)

If you have existing data in Edge Config, migrate it to PostgreSQL:

```bash
# Migrate data
npx tsx lib/database/migrate-edge-to-pg.ts migrate

# Validate migration
npx tsx lib/database/migrate-edge-to-pg.ts validate
```

## Database Schema

### Tables Created

1. **stories** - Story data
2. **chapters** - Chapter data
3. **analytics** - Aggregated analytics
4. **top_authors** - Top author statistics
5. **recent_activity** - Recent blockchain activities
6. **chain_metadata** - Blockchain sync information

### Key Features

- **Foreign Key Constraints**: Ensures data integrity
- **Indexes**: Optimized for common queries
- **Triggers**: Automatic timestamp updates
- **BigInt Support**: Handles large numbers using NUMERIC type
- **JSON Support**: Stores complex data structures in JSONB

## API Changes

The API endpoints remain the same, but now use PostgreSQL instead of Edge Config:

- `GET /api/data/stories` - Fetch stories with filtering and pagination
- `GET /api/data/chapters` - Fetch chapters with filtering and pagination
- `GET /api/data/analytics` - Fetch aggregated analytics

## Monitoring Changes

The `ChainMonitor` class now uses `PostgreSQLStore` instead of `EdgeConfigStore`:

- Same interface and functionality
- Better error handling
- Transaction support for atomic updates
- Improved performance for large datasets

## Testing

Test your PostgreSQL integration:

```typescript
import { checkDatabaseConnection } from "./lib/database/migrations";
import { PostgreSQLStore } from "./lib/database/postgreSQLStore";

// Check database connection
const isConnected = await checkDatabaseConnection();
console.log("Database connected:", isConnected);

// Test store operations
const store = new PostgreSQLStore();
const stories = await store.getStoriesData();
console.log("Stories count:", stories.length);
```

## Rollback (if needed)

If you need to rollback to Edge Config:

1. Revert the code changes to use `EdgeConfigStore`
2. Restore Edge Config environment variables
3. The Edge Config data should still be available (if not deleted)

## Production Deployment

For production deployment:

1. Set up a production PostgreSQL database
2. Update environment variables for production
3. Run migrations in production environment
4. Test the application thoroughly
5. Monitor database performance and connections

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check connection parameters in `.env.local`
- Ensure database exists and user has proper permissions

### Migration Issues

- Check Edge Config credentials are still valid
- Verify PostgreSQL tables were created successfully
- Use validation command to compare data

### Performance Issues

- Monitor database connections and pool usage
- Add indexes for custom queries if needed
- Consider connection pooling configuration adjustments

## Support

If you encounter issues during migration:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is properly configured and accessible
4. Test database connectivity independently

## Next Steps

After successful migration:

1. ✅ Remove Edge Config dependencies (optional)
2. ✅ Clean up Edge Config environment variables
3. ✅ Monitor application performance
4. ✅ Consider adding database backups
5. ✅ Optimize queries based on usage patterns
