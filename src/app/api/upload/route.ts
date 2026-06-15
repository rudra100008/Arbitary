import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/src/services/auth.service";
import { rateLimit } from "@/src/lib/rate-limit";
import crypto from "crypto";
import {
  extractExifFlags,
  computePerceptualHash,
  hammingDistance,
  PHASH_DUPLICATE_THRESHOLD,
} from "@/src/lib/image-analysis";
import { db } from "@/src/db";
import { userTasksTable } from "@/src/db/schema";
import { isNotNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const rl = await rateLimit(`upload:${auth.data.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const rawType = (formData.get("type") as string) || "task-proofs";
  const allowedFolders = ["task-proofs", "profile-pictures", "event-heroes", "record_cover", "partner_logo", "member_photo", "about_hero"];
  const type = allowedFolders.includes(rawType) ? rawType : "task-proofs";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Upload service not configured — missing Cloudinary credentials" }, { status: 500 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 });
  }

  // ── Tier-1 image analysis ─────────────────────────────────────────────────
  // Run EXIF extraction and perceptual hashing in parallel.
  // These are best-effort: failures don't block the upload.
  const [exifFlags, phash] = await Promise.allSettled([
    extractExifFlags(buffer),
    computePerceptualHash(buffer),
  ]).then((results) => [
    results[0].status === "fulfilled" ? results[0].value : null,
    results[1].status === "fulfilled" ? results[1].value : null,
  ]);

  // Duplicate image check: compare the new pHash against all existing task-proof hashes
  let isDuplicateImage = false;
  let duplicateImageUserTaskId: number | null = null;
  if (phash && type === "task-proofs") {
    const existingHashes = await db
      .select({ id: userTasksTable.id, proofPhash: userTasksTable.proofPhash })
      .from(userTasksTable)
      .where(isNotNull(userTasksTable.proofPhash));

    for (const row of existingHashes) {
      if (row.proofPhash && hammingDistance(phash, row.proofPhash) <= PHASH_DUPLICATE_THRESHOLD) {
        isDuplicateImage = true;
        duplicateImageUserTaskId = row.id;
        break;
      }
    }
  }

  // ── Cloudinary upload ─────────────────────────────────────────────────────
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${auth.data.id}_${Date.now()}`;
  const folder = `arbitary/${type}`;

  const params: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto.createHash("sha1").update(`${paramString}${apiSecret}`).digest("hex");

  let uploadRes;
  try {
    uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: dataUri,
          folder,
          public_id: publicId,
          timestamp,
          api_key: apiKey,
          signature,
        }),
      },
    );
  } catch (err) {
    return NextResponse.json({ error: `Failed to reach Cloudinary: ${err instanceof Error ? err.message : "network error"}` }, { status: 502 });
  }

  let uploadData;
  try {
    uploadData = await uploadRes.json();
  } catch {
    return NextResponse.json({ error: "Invalid response from Cloudinary" }, { status: 502 });
  }

  if (!uploadRes.ok) {
    return NextResponse.json({ error: uploadData.error?.message || "Cloudinary upload failed" }, { status: 500 });
  }

  // Return the URL plus the image-analysis signals so the caller can
  // persist them into userTasksTable when it saves the submission.
  return NextResponse.json({
    url: uploadData.secure_url,
    imageAnalysis: {
      phash,
      exifFlags,
      isDuplicateImage,
      duplicateImageUserTaskId,
    },
  });
}