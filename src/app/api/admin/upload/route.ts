import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "product-images";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `products/${filename}`;

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "x-upsert": "true",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: await file.arrayBuffer(),
    }
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    console.error("Supabase upload error:", {
      status: uploadRes.status,
      statusText: uploadRes.statusText,
      error: text,
    });
    return NextResponse.json(
      { error: `Upload failed: ${text || uploadRes.statusText}` },
      { status: uploadRes.status }
    );
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  return NextResponse.json({ url: publicUrl });
}
