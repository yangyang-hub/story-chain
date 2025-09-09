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

  async updateDataIncremental(newData: Partial<ChainDataStore>): Promise<void> {
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
      console.error("Failed to update PostgreSQL data incrementally:", error);
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

  async getStoryById(id: string): Promise<StoryData | null> {
    try {
      const result = await db.query(
        `
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
        WHERE id = $1
      `,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...result.rows[0],
        totalTips: result.rows[0].totalTips.toString(),
      };
    } catch (error) {
      console.error("Failed to get story by id:", error);
      return null;
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

  async getChapterById(id: string): Promise<ChapterData | null> {
    try {
      const result = await db.query(
        `
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
        WHERE id = $1
      `,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...result.rows[0],
        totalTips: result.rows[0].totalTips.toString(),
      };
    } catch (error) {
      console.error("Failed to get chapter by id:", error);
      return null;
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
    if (stories.length === 0) return;

    // 使用UPSERT操作实现增量同步
    for (const story of stories) {
      await client.query(
        `
        INSERT INTO stories (
          id, author, ipfs_hash, created_time, likes, fork_count, 
          total_tips, total_tip_count, block_number, transaction_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          likes = EXCLUDED.likes,
          fork_count = EXCLUDED.fork_count,
          total_tips = EXCLUDED.total_tips,
          total_tip_count = EXCLUDED.total_tip_count,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
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
        ],
      );
    }
  }

  private async updateChapters(chapters: ChapterData[], client: any): Promise<void> {
    if (chapters.length === 0) return;

    // 使用UPSERT操作实现增量同步
    for (const chapter of chapters) {
      await client.query(
        `
        INSERT INTO chapters (
          id, story_id, parent_id, author, ipfs_hash, created_time, 
          likes, fork_count, chapter_number, total_tips, total_tip_count, 
          block_number, transaction_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          likes = EXCLUDED.likes,
          fork_count = EXCLUDED.fork_count,
          total_tips = EXCLUDED.total_tips,
          total_tip_count = EXCLUDED.total_tip_count,
          updated_at = CURRENT_TIMESTAMP
      `,
        [
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
        ],
      );
    }
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

    // Delete old dependent records first to avoid foreign key constraint violations
    await client.query("DELETE FROM top_authors WHERE analytics_id != $1", [analyticsId]);
    await client.query("DELETE FROM recent_activity WHERE analytics_id != $1", [analyticsId]);
    await client.query("DELETE FROM analytics WHERE id != $1", [analyticsId]);
  }

  // 直接处理单个事件，避免加载全量数据到内存
  async processEventDirectly(
    eventType: string,
    eventData: any,
    blockNumber: number,
    transactionHash: string,
    timestamp: number,
  ): Promise<void> {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      switch (eventType) {
        case "StoryCreated":
          await this.handleStoryCreatedDirect(eventData, blockNumber, transactionHash, timestamp, client);
          break;
        case "ChapterCreated":
        case "ChapterForked":
          await this.handleChapterCreatedDirect(eventData, blockNumber, transactionHash, timestamp, client);
          break;
        case "StoryLiked":
          await this.handleStoryLikedDirect(eventData, client);
          break;
        case "ChapterLiked":
          await this.handleChapterLikedDirect(eventData, client);
          break;
        case "tipSent":
          await this.handleTipSentDirect(eventData, client);
          break;
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("处理事件失败:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async handleStoryCreatedDirect(
    eventData: any,
    blockNumber: number,
    transactionHash: string,
    timestamp: number,
    client: any,
  ): Promise<void> {
    const { storyId, author, ipfsHash } = eventData;

    await client.query(
      `
      INSERT INTO stories (
        id, author, ipfs_hash, created_time, likes, fork_count, 
        total_tips, total_tip_count, block_number, transaction_hash
      )
      VALUES ($1, $2, $3, $4, 0, 0, 0, 0, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `,
      [storyId.toString(), author.toLowerCase(), ipfsHash, timestamp, blockNumber, transactionHash],
    );
  }

  private async handleChapterCreatedDirect(
    eventData: any,
    blockNumber: number,
    transactionHash: string,
    timestamp: number,
    client: any,
  ): Promise<void> {
    const { storyId, chapterId, parentId, author, ipfsHash } = eventData;

    // 这里需要获取chapterNumber，但为了避免额外的链上调用，可以设为0或者传入
    await client.query(
      `
      INSERT INTO chapters (
        id, story_id, parent_id, author, ipfs_hash, created_time, 
        likes, fork_count, chapter_number, total_tips, total_tip_count, 
        block_number, transaction_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 1, 0, 0, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        chapterId.toString(),
        storyId.toString(),
        parentId.toString(),
        author.toLowerCase(),
        ipfsHash,
        timestamp,
        blockNumber,
        transactionHash,
      ],
    );
  }

  private async handleStoryLikedDirect(eventData: any, client: any): Promise<void> {
    const { storyId, newLikeCount } = eventData;

    await client.query(
      `
      UPDATE stories 
      SET likes = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `,
      [Number(newLikeCount), storyId.toString()],
    );
  }

  private async handleChapterLikedDirect(eventData: any, client: any): Promise<void> {
    const { chapterId, newLikeCount } = eventData;

    await client.query(
      `
      UPDATE chapters 
      SET likes = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `,
      [Number(newLikeCount), chapterId.toString()],
    );
  }

  private async handleTipSentDirect(eventData: any, client: any): Promise<void> {
    const { storyId, chapterId, amount } = eventData;

    // 更新story的tip信息
    await client.query(
      `
      UPDATE stories 
      SET total_tips = total_tips + $1, 
          total_tip_count = total_tip_count + 1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `,
      [amount.toString(), storyId.toString()],
    );

    // 更新chapter的tip信息
    await client.query(
      `
      UPDATE chapters 
      SET total_tips = total_tips + $1, 
          total_tip_count = total_tip_count + 1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `,
      [amount.toString(), chapterId.toString()],
    );
  }

  // 直接在数据库计算分析数据，避免加载全量数据
  async calculateAnalyticsDirect(): Promise<any> {
    const client = await db.connect();

    try {
      const [statsResult, authorsResult, topAuthorsResult, recentActivityResult] = await Promise.all([
        // 基础统计信息
        client.query(`
          SELECT 
            (SELECT COUNT(*) FROM stories) as total_stories,
            (SELECT COUNT(*) FROM chapters) as total_chapters,
            (SELECT COUNT(DISTINCT author) FROM (
              SELECT author FROM stories UNION SELECT author FROM chapters
            ) combined) as total_authors,
            (SELECT COALESCE(SUM(likes), 0) FROM stories) + (SELECT COALESCE(SUM(likes), 0) FROM chapters) as total_likes,
            (SELECT COALESCE(SUM(total_tips), 0) FROM stories) + (SELECT COALESCE(SUM(total_tips), 0) FROM chapters) as total_tips
        `),

        // 最受欢迎的故事
        client.query(`
          SELECT id, likes, fork_count FROM stories 
          ORDER BY likes DESC, fork_count DESC 
          LIMIT 1
        `),

        // 顶级作者（按收益排序）
        client.query(`
          WITH author_stats AS (
            SELECT 
              author,
              COUNT(*) as story_count,
              0 as chapter_count,
              COALESCE(SUM(total_tips), 0) as total_earnings
            FROM stories 
            GROUP BY author
            UNION ALL
            SELECT 
              author,
              0 as story_count, 
              COUNT(*) as chapter_count,
              COALESCE(SUM(total_tips), 0) as total_earnings
            FROM chapters 
            GROUP BY author
          ),
          aggregated_stats AS (
            SELECT 
              author,
              SUM(story_count) as story_count,
              SUM(chapter_count) as chapter_count,
              SUM(total_earnings) as total_earnings
            FROM author_stats
            GROUP BY author
          )
          SELECT * FROM aggregated_stats 
          ORDER BY total_earnings DESC 
          LIMIT 10
        `),

        // 最近活动（可以从stories和chapters的创建时间推断）
        client.query(`
          SELECT * FROM (
            SELECT 'StoryCreated' as type, created_time as timestamp, 
                   json_build_object('storyId', id, 'author', author) as data
            FROM stories 
            UNION ALL
            SELECT 'ChapterCreated' as type, created_time as timestamp,
                   json_build_object('chapterId', id, 'storyId', story_id, 'author', author) as data  
            FROM chapters 
          ) combined
          ORDER BY timestamp DESC
          LIMIT 50
        `),
      ]);

      const stats = statsResult.rows[0];
      const mostLiked = authorsResult.rows[0];
      const mostForked = authorsResult.rows[0]; // 简化处理，实际中可以单独查询
      const topAuthors = topAuthorsResult.rows.map(row => ({
        address: row.author,
        storyCount: Number(row.story_count),
        chapterCount: Number(row.chapter_count),
        totalEarnings: row.total_earnings.toString(),
      }));
      const recentActivity = recentActivityResult.rows;

      return {
        totalStories: Number(stats.total_stories),
        totalChapters: Number(stats.total_chapters),
        totalAuthors: Number(stats.total_authors),
        totalLikes: Number(stats.total_likes),
        totalTips: stats.total_tips.toString(),
        mostLikedStoryId: mostLiked?.id,
        mostForkedStoryId: mostForked?.id,
        topAuthors,
        recentActivity,
      };
    } finally {
      client.release();
    }
  }

  private async updateMetadata(
    metadata: { lastUpdateBlock?: number; lastUpdateTime?: string },
    client: any,
  ): Promise<void> {
    const lastUpdateBlock = metadata.lastUpdateBlock ?? 0;
    const lastUpdateTime = metadata.lastUpdateTime ?? new Date().toISOString();

    // 使用UPSERT操作：如果记录不存在则插入，存在则更新
    await client.query(
      `
      INSERT INTO chain_metadata (id, last_update_block, last_update_time, created_at, updated_at)
      VALUES (1, $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        last_update_block = EXCLUDED.last_update_block,
        last_update_time = EXCLUDED.last_update_time,
        updated_at = CURRENT_TIMESTAMP
    `,
      [lastUpdateBlock, lastUpdateTime],
    );
  }
}
