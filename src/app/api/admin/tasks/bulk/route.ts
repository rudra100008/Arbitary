import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/services/auth.service";
import { TaskService } from "@/src/services/task.service";
import { z } from "zod";

const bulkTaskItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1).max(5000).optional().default(""),
  taskType: z.string().min(1, "Task type is required").max(50),
  rewardPoint: z.number().int().positive("rewardPoint must be positive"),
  socialPostUrl: z.string().url().max(2048).optional().nullable().default(null),
  videoUrl: z.string().url().max(2048).optional().nullable().default(null),
  platform: z.enum(["facebook", "instagram", "youtube", "tiktok", "daily-login", "share", "screenshot"]).nullable().optional().default(null),
  socialPostId: z.string().max(255).optional().nullable().default(null),
  watchDuration: z.number().int().min(5).max(86400).nullable().optional().default(null),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("easy"),
  isFlash: z.boolean().optional().default(false),
  isShare: z.boolean().optional().default(false),
  shareThreshold: z.number().int().min(1).max(100).optional().default(3),
  expiresAt: z.string().datetime().optional().nullable().default(null),
});

const bulkTaskSchema = z.object({
  tasks: z.array(bulkTaskItemSchema).min(1, "At least one task is required").max(200, "Maximum 200 tasks per batch"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bulkTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await TaskService.bulkCreateTasks(parsed.data.tasks);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(
    { message: `${result.data.count} tasks created successfully`, count: result.data.count },
    { status: 201 },
  );
}