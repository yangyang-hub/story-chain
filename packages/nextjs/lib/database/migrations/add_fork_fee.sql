-- Migration: Add fork_fee field to chapters table
-- Date: 2025-01-13

-- Add fork_fee column to chapters table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chapters' 
        AND column_name = 'fork_fee'
    ) THEN
        ALTER TABLE chapters ADD COLUMN fork_fee NUMERIC(78,0) DEFAULT 0;
        
        -- Add index for the new column
        CREATE INDEX IF NOT EXISTS idx_chapters_fork_fee ON chapters(fork_fee);
        
        -- Update existing chapters to have default fork_fee of 0
        UPDATE chapters SET fork_fee = 0 WHERE fork_fee IS NULL;
        
        RAISE NOTICE 'Added fork_fee column to chapters table';
    ELSE
        RAISE NOTICE 'fork_fee column already exists in chapters table';
    END IF;
END $$;