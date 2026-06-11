import { NextRequest, NextResponse } from "next/server";
import { RecordService } from "@/src/services/record.service";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latestParam = searchParams.get("latest");

  if (latestParam) {
    const limit = parseInt(latestParam, 10);
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ success: false, message: "Invalid 'latest' value" }, { status: 400 });
    }
    const result = await RecordService.getLatestRecords(limit);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, records: result.data }, { status: 200 });
  }

  const result = await RecordService.getRecords();
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, records: result.data }, { status: 200 });
}
