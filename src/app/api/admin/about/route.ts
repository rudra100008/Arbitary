import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { AboutService } from "@/src/services/about.service";

async function deleteCloudinaryImage(url: string | null): Promise<void> {
  if (!url) return;
  try {
    const uploadSegment = "/upload/";
    const idx = url.indexOf(uploadSegment);
    if (idx === -1) return;
    const afterUpload = url.slice(idx + uploadSegment.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const publicId = withoutVersion.replace(/\.[^.]+$/, "");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_id: publicId }),
      },
    );
  } catch {
    // non-critical; orphaned images are acceptable
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await AboutService.getContent();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ about: result.data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  // Clean up old image if heroImageUrl is changing
  if (body.heroImageUrl) {
    const existing = await AboutService.getContent();
    if (existing.success && existing.data?.heroImageUrl && existing.data.heroImageUrl !== body.heroImageUrl) {
      deleteCloudinaryImage(existing.data.heroImageUrl);
    }
  }

  if (body.removeHero) {
    const existing = await AboutService.getContent();
    if (existing.success && existing.data?.heroImageUrl) {
      deleteCloudinaryImage(existing.data.heroImageUrl);
    }
    body.heroImageUrl = null;
  }
  delete body.removeHero;

  const result = await AboutService.upsertContent(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ about: result.data }, { status: 200 });
}
