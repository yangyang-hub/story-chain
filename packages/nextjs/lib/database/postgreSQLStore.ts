import { AnalyticsData, ChainDataStore, ChapterData, StoryData } from "../monitoring/types";
import { db } from "./config";

function jsonStringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value));
}

export class PostgreSQLStore {
  async getData(): Promise<ChainDataStore | null> {
    try {
      const [stories, chapters, analytics, metadata] = await Promise.all([
        this.getStoriesData(),
        this.getChaptersData(),
        this.getAnalyticsData(),
        this.getLastUpdateInfo(),
      ]);

      if (!metadata) {
        return null;
      }

      return {
        stories,
        chapters,
        analytics: analytics || {
          totalStories: 0,
          totalChapters: 0,
          totalAuthors: 0,
          totalLikes: 0,
          totalTips: "0",
          topAuthors: [],
          recentActivity: [],
        },
        lastUpdateBlock: metadata.block,
        lastUpdateTime: metadata.time,
      };
    } catch (error) {
      console.error("Failed to get data from PostgreSQL:", error);
      return null;
    }
  }

  async updateData(newData: Partial<ChainDataStore>): Promise<void> {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      if (newData.stories !== undefined) {
        await this.updateStories(newData.stories, client);
      }

      if (newData.chapters !== undefined) {
        await this.updateChapters(newData.chapters, client);
      }

      if (newData.analytics !== undefined) {
        await this.updateAnalytics(newData.analytics, client);
      }

      if (newData.lastUpdateBlock !== undefined || newData.lastUpdateTime !== undefined) {
        await this.updateMetadata(
          {
            lastUpdateBlock: newData.lastUpdateBlock,
            lastUpdateTime: newData.lastUpdateTime,
          },
          client,
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to update PostgreSQL data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getStoriesData(): Promise<StoryData[]> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          author,
          ipfs_hash as "ipfsHash",
          created_time as "createdTime",
          likes,
          fork_count as "forkCount",
          total_tips as "totalTips",
          total_tip_count as "totalTipCount",
          block_number as "blockNumber",
          transaction_hash as "transactionHash"
        FROM stories
        ORDER BY created_time DESC
      `);

      return result.rows.map(row => ({
        ...row,
        totalTips: row.totalTips.toString(),
      }));
    } catch (error) {
      console.error("Failed to get stories data:", error);
      return [];
    }
  }

  async getChaptersData(): Promise<ChapterData[]> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          story_id as "storyId",
          parent_id as "parentId",
          author,
          ipfs_hash as "ipfsHash",
          created_time as "createdTime",
          likes,
          fork_count as "forkCount",
          chapter_number as "chapterNumber",
          total_tips as "totalTips",
          total_tip_count as "totalTipCount",
          block_number as "blockNumber",
          transaction_hash as "transactionHash"
        FROM chapters
        ORDER BY created_time DESC
      `);

      return result.rows.map(row => ({
        ...row,
        totalTips: row.totalTips.toString(),
      }));
    } catch (error) {
      console.error("Failed to get chapters data:", error);
      return [];
    }
  }

  async getAnalyticsData(): Promise<AnalyticsData | null> {
    try {
      const analyticsResult = await db.query(`
        SELECT 
          total_stories as "totalStories",
          total_chapters as "totalChapters", 
          total_authors as "totalAuthors",
          total_likes as "totalLikes",
          total_tips as "totalTips",
          most_liked_story_id as "mostLikedStoryId",
          most_forked_story_id as "mostForkedStoryId"
        FROM analytics 
        ORDER BY id DESC 
        LIMIT 1
      `);

      if (analyticsResult.rows.length === 0) {
        return null;
      }

      const analytics = analyticsResult.rows[0];

      const [topAuthorsResult, recentActivityResult] = await Promise.all([
        db.query(`
          SELECT 
            address,
            story_count as "storyCount",
            chapter_count as "chapterCount",
            total_earnings as "totalEarnings"
          FROM top_authors ta
          JOIN analytics a ON ta.analytics_id = a.id
          WHERE a.id = (SELECT id FROM analytics ORDER BY id DESC LIMIT 1)
          ORDER BY ta.rank_position
        `),
        db.query(`
          SELECT 
            activity_type as "type",
            timestamp,
            data
          FROM recent_activity ra
          JOIN analytics a ON ra.analytics_id = a.id
          WHERE a.id = (SELECT id FROM analytics ORDER BY id DESC LIMIT 1)
          ORDER BY timestamp DESC
          LIMIT 50
        `),
      ]);

      return {
        ...analytics,
        totalTips: analytics.totalTips.toString(),
        topAuthors: topAuthorsResult.rows.map(row => ({
          ...row,
          totalEarnings: row.totalEarnings.toString(),
        })),
        recentActivity: recentActivityResult.rows,
      };
    } catch (error) {
      console.error("Failed to get analytics data:", error);
      return null;
    }
  }

  async getLastUpdateInfo(): Promise<{ block: number; time: string } | null> {
    try {
      const result = await db.query(`
        SELECT 
          last_update_block as block,
          last_update_time as time
        FROM chain_metadata 
        WHERE id = 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        block: parseInt(result.rows[0].block),
        time: result.rows[0].time.toISOString(),
      };
    } catch (error) {
      console.error("Failed to get metadata:", error);
      return null;
    }
  }

  private async updateStories(stories: StoryData[], client: any): Promise<void> {
    await client.query("DELETE FROM stories");

    if (stories.length === 0) return;

    const values = stories.map(story => [
      story.id,
      story.author,
      story.ipfsHash,
      story.createdTime,
      story.likes,
      story.forkCount,
      story.totalTips,
      story.totalTipCount,
      story.blockNumber,
      story.transactionHash,
    ]);

    const placeholders = values
      .map(
        (_, i) =>
          `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`,
      )
      .join(", ");

    await client.query(
      `
      INSERT INTO stories (id, author, ipfs_hash, created_time, likes, fork_count, total_tips, total_tip_count, block_number, transaction_hash)
      VALUES ${placeholders}
    `,
      values.flat(),
    );
  }

  private async updateChapters(chapters: ChapterData[], client: any): Promise<void> {
    await client.query("DELETE FROM chapters");

    if (chapters.length === 0) return;

    const values = chapters.map(chapter => [
      chapter.id,
      chapter.storyId,
      chapter.parentId,
      chapter.author,
      chapter.ipfsHash,
      chapter.createdTime,
      chapter.likes,
      chapter.forkCount,
      chapter.chapterNumber,
      chapter.totalTips,
      chapter.totalTipCount,
      chapter.blockNumber,
      chapter.transactionHash,
    ]);

    const placeholders = values
      .map(
        (_, i) =>
          `($${i * 13 + 1}, $${i * 13 + 2}, $${i * 13 + 3}, $${i * 13 + 4}, $${i * 13 + 5}, $${i * 13 + 6}, $${i * 13 + 7}, $${i * 13 + 8}, $${i * 13 + 9}, $${i * 13 + 10}, $${i * 13 + 11}, $${i * 13 + 12}, $${i * 13 + 13})`,
      )
      .join(", ");

    await client.query(
      `
      INSERT INTO chapters (id, story_id, parent_id, author, ipfs_hash, created_time, likes, fork_count, chapter_number, total_tips, total_tip_count, block_number, transaction_hash)
      VALUES ${placeholders}
    `,
      values.flat(),
    );
  }

  private async updateAnalytics(analytics: AnalyticsData, client: any): Promise<void> {
    const analyticsResult = await client.query(
      `
      INSERT INTO analytics (
        total_stories, total_chapters, total_authors, total_likes, total_tips,
        most_liked_story_id, most_forked_story_id, last_update_block, last_update_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING id
    `,
      [
        analytics.totalStories,
        analytics.totalChapters,
        analytics.totalAuthors,
        analytics.totalLikes,
        analytics.totalTips,
        analytics.mostLikedStoryId || null,
        analytics.mostForkedStoryId || null,
        0,
      ],
    );

    const analyticsId = analyticsResult.rows[0].id;

    if (analytics.topAuthors && analytics.topAuthors.length > 0) {
      const topAuthorValues = analytics.topAuthors.map((author, index) => [
        analyticsId,
        author.address,
        author.storyCount,
        author.chapterCount,
        author.totalEarnings,
        index + 1,
      ]);

      const placeholders = topAuthorValues
        .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
        .join(", ");

      await client.query(
        `
        INSERT INTO top_authors (analytics_id, address, story_count, chapter_count, total_earnings, rank_position)
        VALUES ${placeholders}
      `,
        topAuthorValues.flat(),
      );
    }

    if (analytics.recentActivity && analytics.recentActivity.length > 0) {
      const activityValues = analytics.recentActivity.map(activity => [
        analyticsId,
        activity.type,
        activity.timestamp,
        jsonStringifyWithBigInt(activity.data),
      ]);

      const placeholders = activityValues
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(", ");

      await client.query(
        `
        INSERT INTO recent_activity (analytics_id, activity_type, timestamp, data)
        VALUES ${placeholders}
      `,
        activityValues.flat(),
      );
    }

    await client.query("DELETE FROM analytics WHERE id != $1", [analyticsId]);
  }

  private async updateMetadata(
    metadata: { lastUpdateBlock?: number; lastUpdateTime?: string },
    client: any,
  ): Promise<void> {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (metadata.lastUpdateBlock !== undefined) {
      updates.push(`last_update_block = $${paramCount}`);
      values.push(metadata.lastUpdateBlock);
      paramCount++;
    }

    if (metadata.lastUpdateTime !== undefined) {
      updates.push(`last_update_time = $${paramCount}`);
      values.push(metadata.lastUpdateTime);
      paramCount++;
    }

    if (updates.length > 0) {
      await client.query(
        `
        UPDATE chain_metadata 
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `,
        values,
      );
    }
  }
}
