import z from "zod";

export const eventSchema = z.object({
    id: z.number().int().positive().nullable().optional(),
    title: z.string().min(1, "Title is required").max(255),
    eventType: z.string().min(1, "Event type is required").max(100),
    status: z.string().min(1, "Status is required").max(100),
    date: z.string().min(1, "Date is required"),
    venue: z.string().max(255).nullable().optional(),
    description: z.string().nullable().optional(),
    heroImageUrl: z.string().url().nullable().optional(),
    contentSections: z.array(z.object({
        type: z.string().min(1).max(50),
        content: z.string().nullable().optional(),
        mediaItems: z.array(z.object({
            url: z.string().min(1, "Media URL is required"),
        })).optional(),
    })).optional(),
    accessTypes: z.array(z.object({
        title: z.string().min(1, "Access type title is required").max(255),
        price: z.string().min(1, "Price is required").max(100),
    })).optional(),
    timelineItems: z.array(z.object({
        time: z.string().min(1, "Time is required").max(100),
        description: z.string().min(1, "Description is required"),
    })).optional(),
}).strict();
