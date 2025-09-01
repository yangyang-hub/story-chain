import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const PINATA_JWT = process.env.PINATA_JWT;

    if (!PINATA_JWT) {
      return NextResponse.json({ error: "PINATA_JWT is not configured in environment variables" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 创建上传到Pinata的FormData
    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    pinataFormData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    pinataFormData.append("pinataOptions", options);

    // 上传到Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata API error:", errorText);
      return NextResponse.json({ error: "Failed to upload file to IPFS" }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      ipfsHash: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
    });
  } catch (error) {
    console.error("IPFS upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
