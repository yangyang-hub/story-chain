// Wrapper for Pinata IPFS service using backend API
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "bronze-working-manatee-308.mypinata.cloud";

// Story metadata type definition
export interface StoryMetadata {
  title: string;
  content: string;
  author: string;
  timestamp: number;
  tags: string[];
  image: string;
  description: string;
}

// Chapter metadata type definition
export interface ChapterMetadata {
  title: string;
  content: string;
  author: string;
  storyId: string;
  chapterNumber: number;
  timestamp: number;
  parentChapterId?: string;
  image?: string;
}

// Comment metadata type definition
export interface CommentMetadata {
  content: string;
  author: string;
  timestamp: number;
  storyId: string;
  chapterId?: string;
  tokenId?: string;
}

// The gateway URL to view your IPFS files
const IPFS_GATEWAYS = [`https://${PINATA_GATEWAY}/ipfs/`, "https://ipfs.io/ipfs/"];

/**
 * Uploads a file to IPFS using our backend API.
 * @param file The file to upload.
 * @returns The IPFS hash (CID) of the uploaded file.
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/ipfs/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload file to IPFS");
    }

    const result = await response.json();
    console.log("File uploaded to IPFS:", result);
    return result.ipfsHash;
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
    throw new Error("Failed to upload file to IPFS.");
  }
};

/**
 * Uploads JSON data to IPFS using our backend API.
 * @param data The JSON data to upload.
 * @returns The IPFS hash (CID) of the uploaded data.
 */
export const uploadJSONToIPFS = async (data: object): Promise<string> => {
  try {
    const response = await fetch("/api/ipfs/upload-json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload JSON to IPFS");
    }

    const result = await response.json();
    console.log("JSON uploaded to IPFS:", result);
    return result.ipfsHash;
  } catch (error) {
    console.error("Error uploading JSON to IPFS:", error);
    throw new Error("Failed to upload JSON to IPFS.");
  }
};

/**
 * Uploads an image file to IPFS. This is a convenience wrapper around uploadToIPFS.
 * @param imageFile The image file to upload.
 * @returns The IPFS hash (CID) of the uploaded image.
 */
export const uploadImageToIPFS = async (imageFile: File): Promise<string> => {
  if (!imageFile.type.startsWith("image/")) {
    throw new Error("File must be an image type.");
  }
  return uploadToIPFS(imageFile);
};

/**
 * Constructs a URL to view an IPFS file through a gateway.
 * @param cid The IPFS content identifier.
 * @param gateway An optional IPFS gateway to use.
 * @returns The full URL to the IPFS content.
 */
export const getIPFSUrl = (cid: string, gateway?: string): string => {
  const selectedGateway = gateway || IPFS_GATEWAYS[0];
  return `${selectedGateway}${cid}`;
};

/**
 * Fetches content from IPFS using a gateway.
 * @param cid The IPFS content identifier.
 * @returns The content of the file as a string.
 */
export const getFromIPFS = async (cid: string): Promise<string> => {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Gateway ${gateway} failed:`, error);
      continue;
    }
  }
  throw new Error("All IPFS gateways failed to fetch the content.");
};

/**
 * Fetches and parses JSON content from IPFS.
 * @param cid The IPFS content identifier.
 * @returns The parsed JSON object.
 */
export const getJSONFromIPFS = async (cid: string): Promise<any> => {
  const text = await getFromIPFS(cid);
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON from IPFS:", error);
    throw new Error("Content from IPFS is not valid JSON.");
  }
};

/**
 * Uploads story metadata to IPFS as JSON.
 * @param metadata The story metadata to upload.
 * @returns The IPFS hash (CID) of the uploaded metadata.
 */
export const uploadStoryMetadata = async (metadata: StoryMetadata): Promise<string> => {
  return uploadJSONToIPFS(metadata);
};

/**
 * Uploads chapter metadata to IPFS as JSON.
 * @param metadata The chapter metadata to upload.
 * @returns The IPFS hash (CID) of the uploaded metadata.
 */
export const uploadChapterMetadata = async (metadata: ChapterMetadata): Promise<string> => {
  return uploadJSONToIPFS(metadata);
};

/**
 * Uploads comment metadata to IPFS as JSON.
 * @param metadata The comment metadata to upload.
 * @returns The IPFS hash (CID) of the uploaded metadata.
 */
export const uploadCommentMetadata = async (metadata: CommentMetadata): Promise<string> => {
  return uploadJSONToIPFS(metadata);
};
