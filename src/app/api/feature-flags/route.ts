import { NextResponse } from "next/server";
import { FeatureFlagsService } from "@/src/services/feature-flags.service";

export const revalidate = 0;

export async function GET() {
  const flags = await FeatureFlagsService.getAll();
  return NextResponse.json({ flags });
}
