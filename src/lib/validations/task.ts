import z from "zod";


export const TaskStatusEnum = z.enum(["In Progress", "Pending Verification", "Completed", "Cancelled"]);
export const VerifyStatusEnum = z.enum(["Verified", "Rejected", "In Progress"]);
export const PlatformEnum = z.enum(["facebook", "instagram", "youtube", "tiktok", "daily-login"]).nullable().optional();


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
});


export const DifficultyEnum = z.enum(["easy", "medium", "hard"]);

export const adminTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().min(1, "Description is required").max(5000),
    taskType: z.string().min(1, "Task type is required").max(50),
    rewardPoint: z.number("rewardPoint must be a number").int().positive("rewardPoint must be positive"),
    socialPostUrl: z.string().url().max(2048).nullable().optional(),
    videoUrl: z.string().url().max(2048).nullable().optional(),
    platform: PlatformEnum,
    socialPostId: z.string().max(255).nullable().optional(),
    watchDuration: z.number().int().min(5).max(86400).nullable().optional(),
    difficulty: DifficultyEnum.optional().default("easy"),
    isFlash: z.boolean().optional().default(false),
    isShare: z.boolean().optional().default(false),
    shareThreshold: z.number().int().min(1).max(100).optional().default(3),
    expiresAt: z.string().datetime().nullable().optional(),
}).strict();


export const verifySubmissionSchema = z.object({
    userTaskId: z.number("userTaskId must be a number").int().positive(),
    status: VerifyStatusEnum,
}).strict();


export const youtubeCompleteSchema = z.object({
    taskId: z.number("taskId must be a number").int().positive(),
    watchedSeconds: z.number("watchedSeconds must be a number").int().min(0),
    fingerprint: z.string().max(255).optional(),
}).strict();

export const youtubePickupSchema = z.object({
    taskId: z.number("taskId must be a number").int().positive(),
}).strict();

export const youtubeHeartbeatSchema = z.object({
    taskId: z.number("taskId must be a number").int().positive(),
    heartbeatIndex: z.number("heartbeatIndex must be a number").int().min(0),
    sessionToken: z.string("sessionToken is required").min(1),
    responseToken: z.string().optional(),
}).strict();
