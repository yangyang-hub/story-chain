import { NextRequest, NextResponse } from "next/server";
import { pinata } from "../../../../utils/config";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    // 上传到Pinata
    const { cid } = await pinata.upload.public.file(file);

    return NextResponse.json({ ipfsHash: cid }, { status: 200 });
  } catch (error) {
    console.error("IPFS upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
