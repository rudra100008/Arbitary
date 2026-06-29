import { db } from "@/src/db";
import { recordsTable } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { ServiceResult, ok, fail } from "./result";

export type RecordItem = {
  id: number;
  title: string;
  artist: string;
  releaseMonth: number | null;
  releaseYear: number | null;
  genre: string | null;
  coverImageUrl: string | null;
  labelColor: string | null;
  youtubeUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export const RecordService = {
  async getRecords(): Promise<ServiceResult<RecordItem[]>> {
    const records = await db
      .select()
      .from(recordsTable)
      .orderBy(desc(recordsTable.createdAt))
      .limit(200);

    return ok(records);
  },

  async getLatestRecords(limit: number): Promise<ServiceResult<RecordItem[]>> {
    const records = await db
      .select()
      .from(recordsTable)
      .orderBy(desc(recordsTable.createdAt))
      .limit(limit);

    return ok(records);
  },

  async getRecordById(id: number): Promise<ServiceResult<RecordItem>> {
    const [record] = await db
      .select()
      .from(recordsTable)
      .where(eq(recordsTable.id, id));

    if (!record) return fail("Record not found", 404);
    return ok(record);
  },

  async createOrUpdateRecord(input: {
    id?: number;
    title: string;
    artist: string;
    releaseMonth?: number | null;
    releaseYear?: number | null;
    genre?: string | null;
    coverImageUrl?: string | null;
    labelColor?: string | null;
    youtubeUrl?: string | null;
  }): Promise<ServiceResult<RecordItem>> {
    const { id, ...data } = input;

    if (!data.title?.trim()) return fail("Title is required", 400);
    if (!data.artist?.trim()) return fail("Artist is required", 400);
    if (!data.youtubeUrl?.trim()) return fail("YouTube link is required", 400);
    if (!/(?:youtube\.com|youtu\.be)/i.test(data.youtubeUrl.trim())) {
      return fail("A valid YouTube link is required", 400);
    }

    const updateData = {
      title: data.title,
      artist: data.artist,
      releaseMonth: data.releaseMonth ?? null,
      releaseYear: data.releaseYear ?? null,
      genre: data.genre ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      labelColor: data.labelColor ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      updatedAt: new Date(),
    };

    if (id) {
      const [updated] = await db
        .update(recordsTable)
        .set(updateData)
        .where(eq(recordsTable.id, id))
        .returning();

      if (!updated) return fail("Record not found", 404);
      return ok(updated);
    }

    const [created] = await db
      .insert(recordsTable)
      .values(updateData)
      .returning();

    return ok(created);
  },

  async deleteRecord(id: number): Promise<ServiceResult<{ message: string }>> {
    const [deleted] = await db
      .delete(recordsTable)
      .where(eq(recordsTable.id, id))
      .returning({ id: recordsTable.id });

    if (!deleted) return fail("Record not found", 404);
    return ok({ message: "Record deleted" });
  },
};
