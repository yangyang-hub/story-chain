import { NextRequest, NextResponse } from "next/server";
import { createChainClient, getContractConfig } from "../../../../lib/chains";
import { Address } from "viem";

export async function GET(request: NextRequest) {
  try {
    // 在请求时动态创建客户端和获取合约配置
    const publicClient = createChainClient();
    const storyChainContract = getContractConfig();

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!storyChainContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 500 });
    }

    if (tokenId) {
      // 获取特定故事/章节的评论
      const offset = (page - 1) * limit;
      const result = await publicClient.readContract({
        address: storyChainContract.address as Address,
        abi: storyChainContract.abi,
        functionName: "getCommentsPaginated",
        args: [BigInt(tokenId), BigInt(offset), BigInt(limit)],
      });

      const comments = result[0]; // commentsArray
      const total = result[1]; // total

      // 转换BigInt为字符串以便JSON序列化
      const serializedComments = comments.map((comment: any) => ({
        id: `${tokenId}-${comment.timestamp.toString()}`, // 生成唯一ID
        tokenId: comment.tokenId.toString(),
        commenter: comment.commenter,
        ipfsHash: comment.ipfsHash,
        createdTime: comment.timestamp.toString(),
        blockNumber: null, // 合约中没有存储区块号
        transactionHash: null, // 合约中没有存储交易哈希
      }));

      return NextResponse.json({
        comments: serializedComments,
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
          hasNext: page * limit < Number(total),
          hasPrev: page > 1,
        },
      });
    } else {
      // 获取所有评论 - 由于合约没有getAllComments方法，我们返回空数组或错误
      // 实际项目中可能需要遍历所有token来获取评论，但这会很昂贵
      return NextResponse.json(
        {
          error: "Getting all comments is not supported. Please specify tokenId parameter.",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error fetching comments from blockchain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
