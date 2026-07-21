import { db } from "@/src/db";
import { aboutContentTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { ServiceResult, ok } from "./result";

export type AboutContent = {
  id: number;
  tagline: string | null;
  heading: string | null;
  description: string | null;
  heroImageUrl: string | null;
  projectsCount: string | null;
  projectsLabel: string | null;
  awardsCount: string | null;
  awardsLabel: string | null;
  motto: string | null;
  mottoAuthor: string | null;
  liveStreamId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const AboutService = {
  async getContent(): Promise<ServiceResult<AboutContent | null>> {
    const rows = await db.select().from(aboutContentTable).limit(1);
    return ok(rows[0] ?? null);
  },

  async upsertContent(input: {
    tagline?: string | null;
    heading?: string | null;
    description?: string | null;
    heroImageUrl?: string | null;
    projectsCount?: string | null;
    projectsLabel?: string | null;
    awardsCount?: string | null;
    awardsLabel?: string | null;
    motto?: string | null;
    mottoAuthor?: string | null;
  }): Promise<ServiceResult<AboutContent>> {
    const existing = await db.select().from(aboutContentTable).limit(1);

    const data = {
      tagline: input.tagline ?? null,
      heading: input.heading ?? null,
      description: input.description ?? null,
      heroImageUrl: input.heroImageUrl ?? null,
      projectsCount: input.projectsCount ?? null,
      projectsLabel: input.projectsLabel ?? null,
      awardsCount: input.awardsCount ?? null,
      awardsLabel: input.awardsLabel ?? null,
      motto: input.motto ?? null,
      mottoAuthor: input.mottoAuthor ?? null,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const [updated] = await db
        .update(aboutContentTable)
        .set(data)
        .where(eq(aboutContentTable.id, existing[0].id))
        .returning();
      return ok(updated);
    }

    const [created] = await db
      .insert(aboutContentTable)
      .values(data)
      .returning();
    return ok(created);
  },

  async getLiveStreamId(): Promise<ServiceResult<string | null>> {
    const rows = await db
      .select({ liveStreamId: aboutContentTable.liveStreamId })
      .from(aboutContentTable)
      .limit(1);
    return ok(rows[0]?.liveStreamId ?? null);
  },

  async setLiveStreamId(liveStreamId: string | null): Promise<ServiceResult<boolean>> {
    const existing = await db.select().from(aboutContentTable).limit(1);
    if (existing.length > 0) {
      await db
        .update(aboutContentTable)
        .set({ liveStreamId, updatedAt: new Date() })
        .where(eq(aboutContentTable.id, existing[0].id));
    } else {
      await db.insert(aboutContentTable).values({ liveStreamId, updatedAt: new Date() });
    }
    return ok(true);
  },
};
