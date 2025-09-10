-- Stories table to store story data
CREATE TABLE IF NOT EXISTS stories (
    id VARCHAR(50) PRIMARY KEY,
    author VARCHAR(42) NOT NULL,
    ipfs_hash TEXT NOT NULL,
    created_time BIGINT NOT NULL,
    likes INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    total_tips NUMERIC(78,0) DEFAULT 0, -- Using NUMERIC to handle BigInt values
    total_tip_count INTEGER DEFAULT 0,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chapters table to store chapter data
CREATE TABLE IF NOT EXISTS chapters (
    id VARCHAR(50) PRIMARY KEY,
    story_id VARCHAR(50) NOT NULL,
    parent_id VARCHAR(50) NOT NULL,
    author VARCHAR(42) NOT NULL,
    ipfs_hash TEXT NOT NULL,
    created_time BIGINT NOT NULL,
    likes INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    chapter_number INTEGER NOT NULL,
    total_tips NUMERIC(78,0) DEFAULT 0, -- Using NUMERIC to handle BigInt values
    total_tip_count INTEGER DEFAULT 0,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id)
);

-- Comments table to store comment data
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(100) PRIMARY KEY, -- transactionHash-logIndex
    token_id VARCHAR(50) NOT NULL, -- story or chapter ID
    commenter VARCHAR(42) NOT NULL,
    ipfs_hash TEXT NOT NULL,
    created_time BIGINT NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table to store aggregated analytics data
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    total_stories INTEGER DEFAULT 0,
    total_chapters INTEGER DEFAULT 0,
    total_authors INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_tips NUMERIC(78,0) DEFAULT 0,
    most_liked_story_id VARCHAR(50),
    most_forked_story_id VARCHAR(50),
    last_update_block BIGINT DEFAULT 0,
    last_update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Top authors table to store top author statistics
CREATE TABLE IF NOT EXISTS top_authors (
    id SERIAL PRIMARY KEY,
    analytics_id INTEGER NOT NULL,
    address VARCHAR(42) NOT NULL,
    story_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    total_earnings NUMERIC(78,0) DEFAULT 0,
    rank_position INTEGER DEFAULT 0,
    FOREIGN KEY (analytics_id) REFERENCES analytics(id)
);

-- Recent activity table to store recent blockchain activities
CREATE TABLE IF NOT EXISTS recent_activity (
    id SERIAL PRIMARY KEY,
    analytics_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- story_created, chapter_created, story_liked, chapter_liked, tip_sent
    timestamp BIGINT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analytics_id) REFERENCES analytics(id)
);

-- Chain metadata table to store blockchain sync information
CREATE TABLE IF NOT EXISTS chain_metadata (
    id SERIAL PRIMARY KEY,
    last_update_block BIGINT DEFAULT 0,
    last_update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author);
CREATE INDEX IF NOT EXISTS idx_stories_created_time ON stories(created_time);
CREATE INDEX IF NOT EXISTS idx_stories_likes ON stories(likes);
CREATE INDEX IF NOT EXISTS idx_stories_total_tips ON stories(total_tips);
CREATE INDEX IF NOT EXISTS idx_stories_block_number ON stories(block_number);

CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_chapters_author ON chapters(author);
CREATE INDEX IF NOT EXISTS idx_chapters_parent_id ON chapters(parent_id);
CREATE INDEX IF NOT EXISTS idx_chapters_created_time ON chapters(created_time);
CREATE INDEX IF NOT EXISTS idx_chapters_likes ON chapters(likes);
CREATE INDEX IF NOT EXISTS idx_chapters_block_number ON chapters(block_number);

CREATE INDEX IF NOT EXISTS idx_comments_token_id ON comments(token_id);
CREATE INDEX IF NOT EXISTS idx_comments_commenter ON comments(commenter);
CREATE INDEX IF NOT EXISTS idx_comments_created_time ON comments(created_time);
CREATE INDEX IF NOT EXISTS idx_comments_block_number ON comments(block_number);

CREATE INDEX IF NOT EXISTS idx_recent_activity_timestamp ON recent_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_recent_activity_type ON recent_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_recent_activity_analytics_id ON recent_activity(analytics_id);

CREATE INDEX IF NOT EXISTS idx_top_authors_analytics_id ON top_authors(analytics_id);
CREATE INDEX IF NOT EXISTS idx_top_authors_address ON top_authors(address);
CREATE INDEX IF NOT EXISTS idx_top_authors_total_earnings ON top_authors(total_earnings);

-- Insert initial chain metadata if it doesn't exist
INSERT INTO chain_metadata (id, last_update_block, last_update_time)
SELECT 1, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM chain_metadata WHERE id = 1);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;
CREATE TRIGGER update_chapters_updated_at 
    BEFORE UPDATE ON chapters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chain_metadata_updated_at ON chain_metadata;
CREATE TRIGGER update_chain_metadata_updated_at 
    BEFORE UPDATE ON chain_metadata 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();