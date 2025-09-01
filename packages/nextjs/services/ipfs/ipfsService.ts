// Wrapper for Pinata IPFS service
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "https://gateway.pinata.cloud";
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://bronze-working-manatee-308.mypinata.cloud";

// The gateway URL to view your IPFS files
const IPFS_GATEWAYS = [`${PINATA_GATEWAY}/ipfs/`, "https://ipfs.io/ipfs/"];

/**
 * Uploads a file to IPFS using Pinata.
 * @param file The file to upload.
 * @returns The IPFS hash (CID) of the uploaded file.
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  if (!PINATA_JWT) {
    throw new Error("NEXT_PUBLIC_PINATA_JWT is not configured in the environment variables.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({
    cidVersion: 0,
  });
  formData.append("pinataOptions", options);

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });
    const resData = await res.json();
    console.log("File uploaded to Pinata:", resData);
    return resData.IpfsHash;
  } catch (error) {
    console.error("Error uploading file to Pinata:", error);
    throw new Error("Failed to upload file to IPFS.");
  }
};

/**
 * Uploads JSON data to IPFS using Pinata.
 * @param data The JSON data to upload.
 * @returns The IPFS hash (CID) of the uploaded data.
 */
export const uploadJSONToIPFS = async (data: object): Promise<string> => {
  if (!PINATA_JWT) {
    throw new Error("NEXT_PUBLIC_PINATA_JWT is not configured in the environment variables.");
  }

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    console.log("JSON uploaded to Pinata:", resData);
    return resData.IpfsHash;
  } catch (error) {
    console.error("Error uploading JSON to Pinata:", error);
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
