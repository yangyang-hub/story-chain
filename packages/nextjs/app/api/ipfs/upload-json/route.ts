import { NextRequest, NextResponse } from "next/server";
import { pinata } from "../../../../utils/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "No valid JSON data provided" }, { status: 400 });
    }
    // 上传到Pinata
    const { cid } = await pinata.upload.public.json(body);

    return NextResponse.json({ ipfsHash: cid }, { status: 200 });
  } catch (error) {
    console.error("IPFS upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
