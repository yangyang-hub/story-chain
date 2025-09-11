import { AnalyticsData, ChainDataStore, ChapterData, CommentData, StoryData } from "../monitoring/types";
import { db } from "./config";

function jsonStringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
}

export class PostgreSQLStore {
  async getData(): Promise<ChainDataStore | null> {
    try {
      const [stories, chapters, comments, analytics, metadata] = await Promise.all([
        this.getStoriesData(),
        this.getChaptersData(),
        this.getCommentsData(),
        this.getAnalyticsData(),
        this.getLastUpdateInfo(),
      ]);

      if (!metadata) {
        return null;
      }

      return {
        stories,
        chapters,
        comments,
        analytics: analytics || {
          totalStories: 0,
          totalChapters: 0,
          totalComments: 0,
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
          fork_fee as "forkFee",
          total_tips as "totalTips",
          total_tip_count as "totalTipCount",
          block_number as "blockNumber",
          transaction_hash as "transactionHash"
        FROM chapters
        ORDER BY created_time DESC
      `);

      return result.rows.map(row => ({
        ...row,
        forkFee: row.forkFee.toString(),
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
          fork_fee as "forkFee",
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
        forkFee: result.rows[0].forkFee.toString(),
        totalTips: result.rows[0].totalTips.toString(),
      };
    } catch (error) {
      console.error("Failed to get chapter by id:", error);
      return null;
    }
  }

  async getCommentsData(): Promise<CommentData[]> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          token_id as "tokenId",
          commenter,
          ipfs_hash as "ipfsHash",
          created_time as "createdTime",
          block_number as "blockNumber",
          transaction_hash as "transactionHash"
        FROM comments
        ORDER BY created_time DESC
      `);

      return result.rows;
    } catch (error) {
      console.error("Failed to get comments data:", error);
      return [];
    }
  }

  async getCommentsByTokenId(tokenId: string): Promise<CommentData[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          token_id as "tokenId",
          commenter,
          ipfs_hash as "ipfsHash",
          created_time as "createdTime",
          block_number as "blockNumber",
          transaction_hash as "transactionHash"
        FROM comments
        WHERE token_id = $1
        ORDER BY created_time ASC
      `,
        [tokenId],
      );

      return result.rows;
    } catch (error) {
      console.error("Failed to get comments by token id:", error);
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
    logIndex: number,
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
        case "CommentAdded":
          await this.handleCommentAddedDirect(eventData, blockNumber, transactionHash, logIndex, timestamp, client);
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

    // 计算正确的章节编号
    let chapterNumber = 1;
    if (parentId.toString() !== "0") {
      // 如果有父章节，查询父章节的编号并加1
      const parentResult = await client.query("SELECT chapter_number FROM chapters WHERE id = $1", [
        parentId.toString(),
      ]);
      if (parentResult.rows.length > 0) {
        chapterNumber = parentResult.rows[0].chapter_number + 1;
      }
    }

    // 从智能合约获取完整的章节数据，包括fork_fee
    let forkFee = "0";
    let totalTips = "0";
    let forkCount = 0;

    try {
      // 创建合约客户端来读取章节数据
      const { createPublicClient, http } = await import("viem");
      const { foundry } = await import("viem/chains");
      const deployedContracts = await import("../../contracts/deployedContracts");

      const contractClient = createPublicClient({
        chain: foundry,
        transport: http(),
      });

      const contract = deployedContracts.default[31337]?.StoryChain;
      if (contract) {
        // 读取章节的完整信息
        const chapterData = await contractClient.readContract({
          address: contract.address as `0x${string}`,
          abi: contract.abi,
          functionName: "getChapter",
          args: [BigInt(chapterId.toString())],
        });

        if (chapterData && typeof chapterData === "object") {
          // 从合约数据中提取fork_fee和其他信息
          const chapter = chapterData as any;
          forkFee = chapter.forkFee?.toString() || "0";
          totalTips = chapter.totalTips?.toString() || "0";
          forkCount = Number(chapter.forkCount) || 0;

          console.log(`✅ 从合约获取章节 ${chapterId} 的fork费用: ${forkFee} wei`);
        }
      }
    } catch (contractError) {
      console.warn(`无法从合约获取章节 ${chapterId} 的详细信息:`, contractError);
      // 继续使用默认值
    }

    await client.query(
      `
      INSERT INTO chapters (
        id, story_id, parent_id, author, ipfs_hash, created_time, 
        likes, fork_count, chapter_number, fork_fee, total_tips, total_tip_count, 
        block_number, transaction_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, 0, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        fork_fee = EXCLUDED.fork_fee,
        total_tips = EXCLUDED.total_tips,
        fork_count = EXCLUDED.fork_count,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        chapterId.toString(),
        storyId.toString(),
        parentId.toString(),
        author.toLowerCase(),
        ipfsHash,
        timestamp,
        forkCount,
        chapterNumber,
        forkFee,
        totalTips,
        blockNumber,
        transactionHash,
      ],
    );

    console.log(`📝 成功创建章节 ${chapterId}，fork费用: ${forkFee} wei`);
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

  private async handleCommentAddedDirect(
    eventData: any,
    blockNumber: number,
    transactionHash: string,
    logIndex: number,
    timestamp: number,
    client: any,
  ): Promise<void> {
    const { chapterId, commenter } = eventData;

    // 使用transactionHash-logIndex作为唯一ID
    const commentId = `${transactionHash}-${logIndex}`;

    try {
      // 从合约中获取评论的完整数据
      let ipfsHash = "";

      try {
        // 创建合约客户端来读取评论数据
        const { createPublicClient, http } = await import("viem");
        const { foundry } = await import("viem/chains");
        const deployedContracts = await import("../../contracts/deployedContracts");

        const contractClient = createPublicClient({
          chain: foundry,
          transport: http(),
        });

        const contract = deployedContracts.default[31337]?.StoryChain;
        if (contract) {
          console.log(`🔍 尝试从合约获取评论数据，chapterId: ${chapterId}, commenter: ${commenter}`);

          // 由于我们不知道确切的评论索引，需要遍历查找最新的评论
          // 通过匹配commenter和时间戳范围来找到对应的评论
          let commentFound = false;

          // 尝试查找最近的几个评论索引（假设新评论在最后几个位置）
          for (let index = 0; index < 10; index++) {
            try {
              const commentResult = await contractClient.readContract({
                address: contract.address as `0x${string}`,
                abi: contract.abi,
                functionName: "comments",
                args: [BigInt(chapterId.toString()), BigInt(index)],
              });

              if (commentResult && Array.isArray(commentResult)) {
                const [tokenId, commentCommenter, commentIpfsHash, commentTimestamp] = commentResult;

                // 检查是否是我们要找的评论（通过commenter匹配）
                if (commentCommenter && commentCommenter.toLowerCase() === commenter.toLowerCase()) {
                  // 检查时间戳是否接近（允许一定范围的差异）
                  const timeDiff = Math.abs(Number(commentTimestamp) - timestamp);
                  if (timeDiff < 300) {
                    // 允许5分钟的时间差异
                    ipfsHash = commentIpfsHash as string;
                    commentFound = true;
                    console.log(`✅ 找到匹配的评论，索引: ${index}, ipfsHash: ${ipfsHash}`);
                    break;
                  }
                }
              }
            } catch (indexError) {
              // 如果索引不存在，继续尝试下一个
              if (index === 0) {
                console.log(`⚠️  索引 ${index} 不存在或无法访问，可能还没有评论`);
              }
              // 如果连续几个索引都失败，可能已经超出范围
              if (index > 2) break;
            }
          }

          if (!commentFound) {
            console.log(`⚠️  未能在合约中找到匹配的评论，将使用空的ipfsHash`);
          }
        }
      } catch (contractError) {
        console.warn(`无法从合约获取评论数据: ${contractError}`);
      }

      // 插入评论记录
      await client.query(
        `
        INSERT INTO comments (
          id, token_id, commenter, ipfs_hash, created_time, 
          block_number, transaction_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          ipfs_hash = EXCLUDED.ipfs_hash,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          commentId,
          chapterId.toString(),
          commenter.toLowerCase(),
          ipfsHash || "", // 使用获取到的ipfsHash，如果获取失败则为空
          timestamp,
          blockNumber,
          transactionHash,
        ],
      );

      console.log(`✅ 成功插入评论: ${commentId} for token ${chapterId}, ipfsHash: ${ipfsHash || "(empty)"}`);

      // 如果ipfsHash为空，记录需要后续处理的评论
      if (!ipfsHash) {
        console.log(`⚠️  评论 ${commentId} 的 ipfsHash 为空，需要后续更新`);
      }
    } catch (error) {
      console.error(`❌ 插入评论失败: ${commentId}`, error);
      throw error;
    }
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
            (SELECT COUNT(*) FROM comments) as total_comments,
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
        totalComments: Number(stats.total_comments),
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

  // 更新缺少ipfsHash的评论
  async updateMissingCommentHashes(): Promise<void> {
    const client = await db.connect();

    try {
      // 查找所有ipfsHash为空的评论
      const result = await client.query(`
        SELECT id, token_id, commenter, created_time, transaction_hash
        FROM comments 
        WHERE ipfs_hash = '' OR ipfs_hash IS NULL
        ORDER BY created_time DESC
        LIMIT 50
      `);

      if (result.rows.length === 0) {
        console.log("没有找到需要更新的评论");
        return;
      }

      console.log(`找到 ${result.rows.length} 个需要更新ipfsHash的评论`);

      // 创建合约客户端
      const { createPublicClient, http } = await import("viem");
      const { foundry } = await import("viem/chains");
      const deployedContracts = await import("../../contracts/deployedContracts");

      const contractClient = createPublicClient({
        chain: foundry,
        transport: http(),
      });

      const contract = deployedContracts.default[31337]?.StoryChain;
      if (!contract) {
        console.error("无法找到合约配置");
        return;
      }

      let updatedCount = 0;

      for (const comment of result.rows) {
        try {
          const { id, token_id: tokenId, commenter, created_time: createdTime } = comment;

          console.log(`尝试更新评论 ${id} 的 ipfsHash...`);

          // 遍历查找匹配的评论
          let ipfsHash = "";
          for (let index = 0; index < 20; index++) {
            try {
              const commentResult = await contractClient.readContract({
                address: contract.address as `0x${string}`,
                abi: contract.abi,
                functionName: "comments",
                args: [BigInt(tokenId), BigInt(index)],
              });

              if (commentResult && Array.isArray(commentResult)) {
                const [, commentCommenter, commentIpfsHash, commentTimestamp] = commentResult;

                // 匹配commenter和时间戳
                if (commentCommenter && commentCommenter.toLowerCase() === commenter.toLowerCase()) {
                  const timeDiff = Math.abs(Number(commentTimestamp) * 1000 - createdTime);
                  if (timeDiff < 300000) {
                    // 5分钟的差异
                    ipfsHash = commentIpfsHash as string;
                    console.log(`✅ 找到匹配的评论，索引: ${index}, ipfsHash: ${ipfsHash}`);
                    break;
                  }
                }
              }
            } catch (indexError) {
              // 继续下一个索引
              continue;
            }
          }

          if (ipfsHash) {
            // 更新数据库中的ipfsHash
            await client.query("UPDATE comments SET ipfs_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
              ipfsHash,
              id,
            ]);
            updatedCount++;
            console.log(`✅ 成功更新评论 ${id} 的 ipfsHash: ${ipfsHash}`);
          } else {
            console.log(`⚠️  未找到评论 ${id} 在合约中的对应数据`);
          }
        } catch (error) {
          console.error(`更新评论 ${comment.id} 失败:`, error);
        }
      }

      console.log(`✅ 成功更新了 ${updatedCount}/${result.rows.length} 个评论的 ipfsHash`);
    } catch (error) {
      console.error("更新评论ipfsHash失败:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 同步章节的fork费用和其他详细信息
  async syncChapterDetails(): Promise<void> {
    const client = await db.connect();

    try {
      // 获取所有需要同步fork费用的章节
      const result = await client.query(`
        SELECT id, fork_fee FROM chapters 
        WHERE fork_fee = 0 OR fork_fee IS NULL
        ORDER BY created_time ASC
        LIMIT 50
      `);

      if (result.rows.length === 0) {
        console.log("📊 所有章节的fork费用已是最新");
        return;
      }

      console.log(`📊 开始同步 ${result.rows.length} 个章节的详细信息...`);

      // 创建合约客户端
      const { createPublicClient, http } = await import("viem");
      const { foundry } = await import("viem/chains");
      const deployedContracts = await import("../../contracts/deployedContracts");

      const contractClient = createPublicClient({
        chain: foundry,
        transport: http(),
      });

      const contract = deployedContracts.default[31337]?.StoryChain;
      if (!contract) {
        console.error("无法找到合约配置");
        return;
      }

      let updatedCount = 0;

      for (const chapter of result.rows) {
        try {
          // 从智能合约获取章节的完整数据
          const chapterData = await contractClient.readContract({
            address: contract.address as `0x${string}`,
            abi: contract.abi,
            functionName: "getChapter",
            args: [BigInt(chapter.id)],
          });

          if (chapterData && typeof chapterData === "object") {
            const chapterInfo = chapterData as any;
            const forkFee = chapterInfo.forkFee?.toString() || "0";
            const totalTips = chapterInfo.totalTips?.toString() || "0";
            const forkCount = Number(chapterInfo.forkCount) || 0;

            await client.query(
              `
              UPDATE chapters 
              SET fork_fee = $1, total_tips = $2, fork_count = $3, updated_at = CURRENT_TIMESTAMP
              WHERE id = $4
            `,
              [forkFee, totalTips, forkCount, chapter.id],
            );

            updatedCount++;
            console.log(`✅ 同步章节 ${chapter.id} - fork费用: ${forkFee} wei`);
          }
        } catch (error) {
          console.warn(`获取章节 ${chapter.id} 的合约数据失败:`, error);
        }
      }

      console.log(`✅ 成功同步了 ${updatedCount}/${result.rows.length} 个章节的详细信息`);
    } catch (error) {
      console.error("同步章节详细信息失败:", error);
    } finally {
      client.release();
    }
  }

  // 修复章节编号
  async fixChapterNumbers(): Promise<void> {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // 获取所有故事的章节，按创建时间排序
      const result = await client.query(`
        SELECT id, parent_id, story_id, created_time, chapter_number
        FROM chapters 
        ORDER BY story_id, created_time ASC
      `);

      console.log(`📊 开始修复 ${result.rows.length} 个章节的编号...`);

      // 按故事分组处理
      const storiesMap = new Map();
      for (const chapter of result.rows) {
        if (!storiesMap.has(chapter.story_id)) {
          storiesMap.set(chapter.story_id, []);
        }
        storiesMap.get(chapter.story_id).push(chapter);
      }

      let updatedCount = 0;

      for (const [storyId, chapters] of storiesMap) {
        console.log(`📖 处理故事 ${storyId} 的 ${chapters.length} 个章节...`);

        // 构建章节层次结构
        const chapterMap = new Map();
        chapters.forEach(chapter => {
          chapterMap.set(chapter.id, chapter);
        });

        // 递归计算章节编号
        const calculateChapterNumber = (chapterId, visited = new Set()) => {
          if (visited.has(chapterId)) {
            return 1; // 避免循环引用
          }
          visited.add(chapterId);

          const chapter = chapterMap.get(chapterId);
          if (!chapter) return 1;

          if (chapter.parent_id === "0") {
            return 1; // 根章节
          }

          const parentNumber = calculateChapterNumber(chapter.parent_id, visited);
          return parentNumber + 1;
        };

        // 更新每个章节的编号
        for (const chapter of chapters) {
          const correctNumber = calculateChapterNumber(chapter.id);

          if (chapter.chapter_number !== correctNumber) {
            await client.query("UPDATE chapters SET chapter_number = $1 WHERE id = $2", [correctNumber, chapter.id]);
            updatedCount++;
            console.log(`✅ 更新章节 ${chapter.id}: ${chapter.chapter_number} -> ${correctNumber}`);
          }
        }
      }

      await client.query("COMMIT");
      console.log(`✅ 成功修复了 ${updatedCount} 个章节的编号`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("修复章节编号失败:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}
