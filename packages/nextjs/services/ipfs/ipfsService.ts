import { create } from "kubo-rpc-client";
import type { IPFSHTTPClient } from "kubo-rpc-client";

// IPFS 客户端配置
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

let ipfsClient: IPFSHTTPClient | null = null;

// 初始化 IPFS 客户端
const getIPFSClient = (): IPFSHTTPClient => {
  if (!ipfsClient) {
    try {
      // 优先使用本地 IPFS 节点
      ipfsClient = create({
        host: "localhost",
        port: 5001,
        protocol: "http",
      });
    } catch (error) {
      console.warn("本地 IPFS 节点不可用，使用公共网关");
      // 使用公共 IPFS 网关
      ipfsClient = create({
        host: "ipfs.infura.io",
        port: 5001,
        protocol: "https",
        headers: {
          authorization: process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET ? 
            `Basic ${Buffer.from(
              `${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}:${process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET}`
            ).toString("base64")}` : undefined,
        },
      });
    }
  }
  return ipfsClient;
};

// 上传文件到 IPFS
export const uploadToIPFS = async (file: File | string | object): Promise<string> => {
  try {
    const client = getIPFSClient();
    
    let content: any;
    
    if (typeof file === "string") {
      // 文本内容
      content = file;
    } else if (file instanceof File) {
      // 文件对象
      content = file;
    } else {
      // JSON 对象
      content = JSON.stringify(file);
    }

    const result = await client.add(content, {
      progress: (prog: number) => console.log(`上传进度: ${prog} bytes`),
    });

    console.log("IPFS 上传成功:", result.cid.toString());
    return result.cid.toString();
  } catch (error) {
    console.error("IPFS 上传失败:", error);
    throw new Error("IPFS 上传失败");
  }
};

// 上传JSON数据到IPFS
export const uploadJSONToIPFS = async (data: object): Promise<string> => {
  return uploadToIPFS(data);
};

// 上传文本到IPFS
export const uploadTextToIPFS = async (text: string): Promise<string> => {
  return uploadToIPFS(text);
};

// 上传图片到IPFS
export const uploadImageToIPFS = async (imageFile: File): Promise<string> => {
  if (!imageFile.type.startsWith("image/")) {
    throw new Error("文件类型必须是图片");
  }
  return uploadToIPFS(imageFile);
};

// 从 IPFS 获取内容
export const getFromIPFS = async (cid: string): Promise<string> => {
  try {
    // 尝试多个网关
    for (const gateway of IPFS_GATEWAYS) {
      try {
        const response = await fetch(`${gateway}${cid}`, {
          timeout: 5000,
        });
        
        if (response.ok) {
          return await response.text();
        }
      } catch (error) {
        console.warn(`网关 ${gateway} 失败:`, error);
        continue;
      }
    }
    
    throw new Error("所有 IPFS 网关都不可用");
  } catch (error) {
    console.error("从 IPFS 获取内容失败:", error);
    throw new Error("获取 IPFS 内容失败");
  }
};

// 从 IPFS 获取 JSON 数据
export const getJSONFromIPFS = async (cid: string): Promise<any> => {
  const text = await getFromIPFS(cid);
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("解析 JSON 失败:", error);
    throw new Error("IPFS 内容不是有效的 JSON");
  }
};

// 获取 IPFS 文件的 URL
export const getIPFSUrl = (cid: string, gateway?: string): string => {
  const selectedGateway = gateway || IPFS_GATEWAYS[0];
  return `${selectedGateway}${cid}`;
};

// 检查 IPFS 内容是否可访问
export const checkIPFSAvailability = async (cid: string): Promise<boolean> => {
  try {
    await getFromIPFS(cid);
    return true;
  } catch {
    return false;
  }
};

// 创建故事元数据
export interface StoryMetadata {
  title: string;
  content: string;
  author: string;
  timestamp: number;
  tags?: string[];
  image?: string;
  description?: string;
}

export const uploadStoryMetadata = async (metadata: StoryMetadata): Promise<string> => {
  const storyData = {
    name: metadata.title,
    description: metadata.description || metadata.content.slice(0, 200) + "...",
    content: metadata.content,
    author: metadata.author,
    timestamp: metadata.timestamp,
    tags: metadata.tags || [],
    image: metadata.image,
    attributes: [
      {
        trait_type: "Author",
        value: metadata.author,
      },
      {
        trait_type: "Created",
        value: new Date(metadata.timestamp).toISOString(),
      },
      {
        trait_type: "Content Length",
        value: metadata.content.length,
      },
    ],
  };

  return uploadJSONToIPFS(storyData);
};

// 创建章节元数据
export interface ChapterMetadata {
  title: string;
  content: string;
  author: string;
  timestamp: number;
  storyId: string;
  parentChapterId?: string;
  chapterNumber: number;
  tags?: string[];
  image?: string;
}

export const uploadChapterMetadata = async (metadata: ChapterMetadata): Promise<string> => {
  const chapterData = {
    name: metadata.title,
    description: `第 ${metadata.chapterNumber} 章: ${metadata.content.slice(0, 200)}...`,
    content: metadata.content,
    author: metadata.author,
    timestamp: metadata.timestamp,
    storyId: metadata.storyId,
    parentChapterId: metadata.parentChapterId,
    chapterNumber: metadata.chapterNumber,
    tags: metadata.tags || [],
    image: metadata.image,
    attributes: [
      {
        trait_type: "Author",
        value: metadata.author,
      },
      {
        trait_type: "Chapter Number",
        value: metadata.chapterNumber,
      },
      {
        trait_type: "Story ID",
        value: metadata.storyId,
      },
      {
        trait_type: "Created",
        value: new Date(metadata.timestamp).toISOString(),
      },
    ],
  };

  return uploadJSONToIPFS(chapterData);
};

// 创建评论元数据
export interface CommentMetadata {
  content: string;
  author: string;
  timestamp: number;
  tokenId: string;
}

export const uploadCommentMetadata = async (metadata: CommentMetadata): Promise<string> => {
  const commentData = {
    content: metadata.content,
    author: metadata.author,
    timestamp: metadata.timestamp,
    tokenId: metadata.tokenId,
    type: "comment",
  };

  return uploadJSONToIPFS(commentData);
};