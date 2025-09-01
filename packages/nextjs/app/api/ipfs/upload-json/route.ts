import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const PINATA_JWT = process.env.PINATA_JWT;

    if (!PINATA_JWT) {
      return NextResponse.json({ error: "PINATA_JWT is not configured in environment variables" }, { status: 500 });
    }

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "No valid JSON data provided" }, { status: 400 });
    }

    // 上传JSON到Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata API error:", errorText);
      return NextResponse.json({ error: "Failed to upload JSON to IPFS" }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      ipfsHash: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
    });
  } catch (error) {
    console.error("IPFS JSON upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
