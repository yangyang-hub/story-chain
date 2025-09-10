import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/database/config";

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "init-tables") {
      // 读取并执行schema.sql
      const schemaSQL = `
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

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_token_id ON comments(token_id);
CREATE INDEX IF NOT EXISTS idx_comments_commenter ON comments(commenter);
CREATE INDEX IF NOT EXISTS idx_comments_created_time ON comments(created_time);
CREATE INDEX IF NOT EXISTS idx_comments_block_number ON comments(block_number);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
      `;

      const client = await db.connect();
      try {
        await client.query(schemaSQL);
        console.log("✅ 数据库表初始化成功");
        return NextResponse.json({ success: true, message: "数据库表初始化成功" });
      } finally {
        client.release();
      }
    }

    if (action === "check-tables") {
      const client = await db.connect();
      try {
        // 检查comments表是否存在
        const result = await client.query(`
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'comments' 
          ORDER BY ordinal_position
        `);

        return NextResponse.json({
          success: true,
          tables: {
            comments: {
              exists: result.rows.length > 0,
              columns: result.rows,
            },
          },
        });
      } finally {
        client.release();
      }
    }

    if (action === "clear-comments") {
      const client = await db.connect();
      try {
        await client.query("DELETE FROM comments");
        return NextResponse.json({ success: true, message: "评论表已清空" });
      } finally {
        client.release();
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "未知操作",
        availableActions: ["init-tables", "check-tables", "clear-comments"],
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("数据库初始化错误:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 },
    );
  }
}
