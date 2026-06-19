import { z } from "zod";
import { parseSocialUrl } from "@/src/lib/social-url";

const socialMediaUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048, "URL too long")
  .refine((val) => parseSocialUrl(val) !== null, {
    message: "Must be a public YouTube, Instagram, or Facebook link",
  });

export const participantSubmissionSchema = z
  .object({
    category: z.enum(["song", "dance"]),
    name: z.string().trim().min(1, "Name is required").max(255),
    email: z.string().trim().email("Must be a valid email").max(255),
    phone: z.string().trim().max(255).optional(),
    mediaUrl: socialMediaUrlSchema,
  })
  .strict();

export type ParticipantSubmissionInput = z.infer<typeof participantSubmissionSchema>;
