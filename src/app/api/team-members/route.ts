import { NextResponse } from "next/server";
import { TeamMemberService } from "@/src/services/team-member.service";

export const revalidate = 0;

export async function GET() {
  const result = await TeamMemberService.getTeamMembers();
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, teamMembers: result.data }, { status: 200 });
}
