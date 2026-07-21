import z from "zod";

const socialProfileRegex =
    /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com|facebook\.com|instagram\.com)\/[a-zA-Z0-9_.]+\/?$/i;

export const socialProfileUrlSchema = z
    .string()
    .url("Must be a valid URL")
    .regex(socialProfileRegex, "Must be a valid social media profile URL (Twitter/X, Facebook, Instagram)")
    .max(2048, "URL too long");

export const TaskStatusEnum = z.enum(["In Progress", "Pending Verification", "Completed", "Cancelled"]);
export const VerifyStatusEnum = z.enum(["Verified", "Rejected", "In Progress"]);
export const PlatformEnum = z.enum(["facebook", "instagram", "youtube", "daily-login", "share", "screenshot"]).nullable().optional();


export const pickUpTaskSchema = z.object({
    taskId: z
        .number({
            error: (issue) => {
                if (issue.input === undefined) {
                    return "Task id is required";
                }

                return "Task id must be a valid  number";
            }
        })
        .int("Task id must be a integer")
        .positive("Task id must be positive"),
}).strict();


export const getTaskQuerySchema = z.object({
    taskType: z.string()
        .max(50)
        .regex(/^[a-zA-Z_-]+$/, "Invalid taskType format")
        .optional(),
})


export const cancelTaskSchema = z.object({
    taskId: z.string()
        .transform((val) => Number(val))
        .pipe(
            z.number()
                .int("Task id must be an integer")
                .positive("Task id must be positive")
        ),
});


export const UserTaskStatusUpdateEnum = z.enum(["In Progress", "Pending Verification"]);

export const updateTaskSchema = z.object({
    taskId: z
        .number({
            error: (issue) => {
                if (issue.input === undefined) {
                    return "Task id is required";
                }

                return "Task id must be a valid number";
            }
        })
        .int("Task id must be a integer")
        .positive("Task id must be positive"),
    status: UserTaskStatusUpdateEnum,
    proofUrl: z
        .string()
        .url("proofUrl must be a valid URL")
        .max(2048, "URL too long")
        .optional(),
    proofImageUrl: z
        .string()
        .url("proofImageUrl must be a valid URL")
        .max(2048, "URL too long")
        .optional(),
});


export const DifficultyEnum = z.enum(["easy", "medium", "hard"]);

export const adminTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().min(1, "Description is required").max(5000),
    taskType: z.string().min(1, "Task type is required").max(50)
        .refine((val) => ["social", "share", "special", "video_watch", "youtube_subscribe", "youtube_like", "youtube_comment", "SCREENSHOT_UPLOAD"].includes(val), "Invalid task type"),
    rewardPoint: z.number("rewardPoint must be a number").int().positive("rewardPoint must be positive"),
    socialPostUrl: z.string().url().max(2048).nullable().optional(),
    videoUrl: z.string().url().max(2048).nullable().optional(),
    platform: PlatformEnum,
    socialPostId: z.string().max(255).nullable().optional(),
    socialPlatform: z.string().max(50).nullable().optional(),
    targetUrl: z.string().url().max(2048).nullable().optional(),
    isActive: z.boolean().optional().default(true),
    watchDuration: z.number().int().min(5).max(86400).nullable().optional(),
    difficulty: DifficultyEnum.optional().default("easy"),
    isFlash: z.boolean().optional().default(false),
    isShare: z.boolean().optional().default(false),
    shareThreshold: z.number().int().min(1).max(100).optional().default(3),
    expiresAt: z.string().datetime().nullable().optional(),
    commentInstruction: z.string().max(2000).nullable().optional(),
    /** true = Daily Refresh, false = Permanent (one-time) */
    isRecurring: z.boolean().default(false),
}).strict();


export const verifySubmissionSchema = z.object({
    userTaskId: z.number("userTaskId must be a number").int().positive(),
    status: VerifyStatusEnum,
    rejectionReason: z.string().trim().min(1, "Rejection reason cannot be empty").max(500, "Rejection reason is too long").optional(),
}).strict().refine(
    (data) => data.status !== "Rejected" || !!data.rejectionReason,
    {
        message: "A rejection reason is required when rejecting a submission",
        path: ["rejectionReason"],
    },
);


export const youtubeCompleteSchema = z.object({
    taskId: z.number("taskId must be a number").int().positive(),
    sessionId: z.number("sessionId must be a number").int().positive().optional(),
    fingerprint: z.string().max(255).optional(),
}).strict();