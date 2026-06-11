import { NextResponse } from "next/server";
import { PartnerService } from "@/src/services/partner.service";

export const revalidate = 0;

export async function GET() {
  const result = await PartnerService.getPartners();
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, partners: result.data }, { status: 200 });
}
