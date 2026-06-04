import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "task-proofs";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Upload service not configured" }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: dataUri,
        upload_preset: "ml_default",
        folder: `arbitary/${type}`,
        public_id: `${auth.data.id}_${Date.now()}`,
      }),
    },
  );

  const uploadData = await uploadRes.json();

  if (!uploadRes.ok) {
    return NextResponse.json({ error: uploadData.error?.message || "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ url: uploadData.secure_url });
}
