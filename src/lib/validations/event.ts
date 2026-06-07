import z from "zod";

export const eventSchema = z.object({
    id: z.number().int().positive().nullable().optional(),
    title: z.string().min(1, "Event title is required").max(255),
    eventType: z.string().min(1, "Event type is required").max(100),
    status: z.string().min(1, "Status is required").max(100),
    date: z.string()
        .min(1, "Event date is required")
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    venue: z.string().max(255).nullable().optional(),
    description: z.string().nullable().optional(),
    heroImageUrl: z.string().nullable().optional(),
    contentSections: z.array(z.object({
        id: z.number().int().positive("Invalid section ID").optional(),
        type: z.string().min(1, "Section type is required").max(50),
        content: z.string().nullable().optional(),
        mediaItems: z.array(z.object({
            id: z.number().int().positive("Invalid media item ID").optional(),
            url: z.string().min(1, "Media URL is required"),
        })).optional(),
    })).optional(),
    accessTypes: z.array(z.object({
        id: z.number().int().positive("Invalid access type ID").optional(),
        title: z.string().min(1, "Access type title is required").max(255),
        price: z.string()
            .min(1, "Price is required")
            .regex(/^(\$?\d+(\.\d{1,2})?|Free)$/i, "Price must be valid (e.g. 100, 49.99, Free)"),
        pointCost: z.number().int().nonnegative("Points cost must be non-negative").default(0),
    })).min(1, "At least one access type is required").optional(),
    timelineItems: z.array(z.object({
        id: z.number().int().positive("Invalid timeline item ID").optional(),
        time: z.string().min(1, "Time is required").max(100),
        description: z.string().min(1, "Description is required"),
    })).optional(),
}).strict();
