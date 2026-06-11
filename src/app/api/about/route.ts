import { NextResponse } from "next/server";
import { AboutService } from "@/src/services/about.service";

export const revalidate = 0;

export async function GET() {
  const result = await AboutService.getContent();
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, about: result.data }, { status: 200 });
}
