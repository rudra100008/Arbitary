import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { verifySubmissionSchema } from "@/src/lib/validations/task";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const result = await TaskService.getSubmissions();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const parsed = verifySubmissionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { userTaskId, status } = parsed.data;
  const result = await TaskService.verifySubmission(userTaskId, status);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: (result as any).status ?? 400 });
  }

  return NextResponse.json({ message: result.data.message }, { status: 200 });
}
