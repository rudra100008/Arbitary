import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { PartnerService } from "@/src/services/partner.service";

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

  const result = await PartnerService.getPartners();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ partners: result.data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  if (body.id && (body.removeCover || body.logoUrl)) {
    const existing = await PartnerService.getPartnerById(body.id);
    if (existing.success && existing.data?.logoUrl) {
      if (body.removeCover || body.logoUrl !== existing.data.logoUrl) {
        deleteCloudinaryImage(existing.data.logoUrl);
      }
    }
  }

  if (body.removeCover) {
    body.logoUrl = null;
  }
  delete body.removeCover;

  const result = await PartnerService.createOrUpdatePartner(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ partner: result.data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await req.json();
  const result = await PartnerService.deletePartner(Number(id));
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ message: "Partner deleted" }, { status: 200 });
}
