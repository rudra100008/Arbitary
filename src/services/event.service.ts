import { db } from "@/src/db";
import {
  eventsTable,
  contentSectionsTable,
  mediaItemsTable,
  accessTypesTable,
  timelineItemsTable,
} from "@/src/db/schema";
import { eq, desc, inArray, lt, gte } from "drizzle-orm";
import { eventSchema } from "@/src/lib/validations/event";
import { revalidatePath } from "next/cache";
import { ServiceResult, ok, fail, failWithDetails } from "./result";
import { deleteCloudinaryImage } from "@/src/lib/cloudinary";
import type { Event, ContentSection, MediaItem, AccessType, TimelineItem } from "@/src/types/db";

type EventWithRelations = Event & {
  accessTypes: AccessType[];
  timelineItems: TimelineItem[];
  contentSections: (ContentSection & { mediaItems: MediaItem[] })[];
};

export type EventListItem = Pick<
  Event,
  "id" | "title" | "eventType" | "status" | "priority" | "eventDate" | "venue" | "description" | "heroImageUrl" | "imageType" | "eventTime" | "accentColor" | "youtubeUrl" | "createdAt"
>;

async function syncMediaItems(tx: any, sectionId: number, mediaItems: { id?: number; url: string }[]) {
  const currentMedia: { id: number; url: string }[] = await tx
    .select({ id: mediaItemsTable.id, url: mediaItemsTable.url })
    .from(mediaItemsTable)
    .where(eq(mediaItemsTable.sectionId, sectionId));

  const currentIds = currentMedia.map((m) => m.id);
  const inputIds = mediaItems.map((m) => m.id).filter((id): id is number => id !== undefined);

  const mediaToDelete = currentMedia.filter((m) => !inputIds.includes(m.id));
  const mediaToUpdate = mediaItems.filter((m) => m.id !== undefined && currentIds.includes(m.id));
  const mediaToInsert = mediaItems.filter((m) => m.id === undefined);

  if (mediaToDelete.length) {
    await tx.delete(mediaItemsTable).where(inArray(mediaItemsTable.id, mediaToDelete.map((m) => m.id)));

    for (const m of mediaToDelete) {
      deleteCloudinaryImage(m.url);
    }
  }

  for (const m of mediaToUpdate) {
    const oldItem = currentMedia.find((c) => c.id === m.id);
    if (oldItem && oldItem.url && oldItem.url !== m.url) {
      deleteCloudinaryImage(oldItem.url);
    }

    const idx = mediaItems.indexOf(m);
    await tx.update(mediaItemsTable)
      .set({ url: m.url, order: idx })
      .where(eq(mediaItemsTable.id, m.id!));
  }

  if (mediaToInsert.length) {
    await tx.insert(mediaItemsTable).values(
      mediaToInsert.map(m => {
        const idx = mediaItems.indexOf(m);
        return { sectionId, url: m.url, order: idx };
      })
    );
  }
}

export const EventService = {
  async getEvents(): Promise<ServiceResult<EventListItem[]>> {
    try {
      const events = await db
        .select({
          id: eventsTable.id,
          title: eventsTable.title,
          eventType: eventsTable.eventType,
          status: eventsTable.status,
          priority: eventsTable.priority,
          eventDate: eventsTable.eventDate,
          venue: eventsTable.venue,
          description: eventsTable.description,
          heroImageUrl: eventsTable.heroImageUrl,
          imageType: eventsTable.imageType,
          eventTime: eventsTable.eventTime,
          accentColor: eventsTable.accentColor,
          youtubeUrl: eventsTable.youtubeUrl,
          createdAt: eventsTable.createdAt,
        })
        .from(eventsTable)
        .orderBy(desc(eventsTable.eventDate))
        .limit(100);

      return ok(events);
    } catch (err) {
      console.error("EventService.getEvents failed:", err);
      return fail("Failed to load events", 500);
    }
  },

  async cleanupPastEvents(): Promise<void> {
    const now = new Date();
    try {
      await db.delete(eventsTable).where(lt(eventsTable.eventDate, now));
    } catch (err) {
      console.error("Failed to delete past events:", err);
    }
  },

  async getEventById(eventId: number): Promise<ServiceResult<EventWithRelations>> {
    const event = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, eventId),
      with: {
        accessTypes: {
          orderBy: (accessTypes, { asc }) => [asc(accessTypes.order)],
        },
        timelineItems: {
          orderBy: (timelineItems, { asc }) => [asc(timelineItems.order)],
        },
        contentSections: {
          orderBy: (contentSections, { asc }) => [asc(contentSections.order)],
          with: {
            mediaItems: {
              orderBy: (mediaItems, { asc }) => [asc(mediaItems.order)],
            },
          },
        },
      },
    });

    if (!event) return fail("Event not found", 404);

    return ok(event as unknown as EventWithRelations);
  },

  async createOrUpdateEvent(
    input: unknown,
  ): Promise<ServiceResult<Event>> {
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) {
      return failWithDetails(
        "Some fields need your attention. Check the highlighted fields below.",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        400,
      );
    }

    const { id, title, eventType, status, priority, date, venue, description, heroImageUrl, imageType, eventTime, accentColor, youtubeUrl, contentSections, accessTypes, timelineItems } = parsed.data;

    const eventDate = date ? new Date(date) : new Date();
    const normalizedYoutubeUrl = youtubeUrl && youtubeUrl.trim() !== "" ? youtubeUrl.trim() : null;

    // --- Ownership & Authorization Guards (only for updates) ---
    if (id) {
      const eventId = Number(id);
      const inputAccessTypeIds = (accessTypes ?? []).map(a => a.id).filter(Boolean);
      const inputTimelineIds = (timelineItems ?? []).map(t => t.id).filter(Boolean);
      const inputSectionIds = (contentSections ?? []).map(s => s.id).filter(Boolean);

      if (inputAccessTypeIds.length || inputTimelineIds.length || inputSectionIds.length) {
        const [dbAccessTypes, dbTimelineItems, dbSections] = await Promise.all([
          db.select({ id: accessTypesTable.id }).from(accessTypesTable).where(eq(accessTypesTable.eventId, eventId)),
          db.select({ id: timelineItemsTable.id }).from(timelineItemsTable).where(eq(timelineItemsTable.eventId, eventId)),
          db.select({ id: contentSectionsTable.id }).from(contentSectionsTable).where(eq(contentSectionsTable.eventId, eventId)),
        ]);

        const validAccessTypeIds = new Set(dbAccessTypes.map(r => r.id));
        const validTimelineIds = new Set(dbTimelineItems.map(r => r.id));
        const validSectionIds = new Set(dbSections.map(r => r.id));

        if (
          inputAccessTypeIds.some(id => !validAccessTypeIds.has(id!)) ||
          inputTimelineIds.some(id => !validTimelineIds.has(id!)) ||
          inputSectionIds.some(id => !validSectionIds.has(id!))
        ) {
          return fail("Invalid relation ID submitted for this event", 400);
        }
      }
    }

    const result = await db.transaction(async (tx) => {
      let eventId: number;
      let finalEvent: Event;

      if (id) {
        const eventIdNum = Number(id);

        const [existing] = await tx
          .select({ heroImageUrl: eventsTable.heroImageUrl })
          .from(eventsTable)
          .where(eq(eventsTable.id, eventIdNum));

        const [updated] = await tx
          .update(eventsTable)
          .set({ title, eventType, status, priority, eventDate, venue, description, heroImageUrl, imageType, eventTime, accentColor: accentColor || "#FACC15", youtubeUrl: normalizedYoutubeUrl })
          .where(eq(eventsTable.id, eventIdNum))
          .returning();

        if (!updated) throw new Error(`Event ${id} not found`);
        finalEvent = updated;
        eventId = eventIdNum;

        if (existing?.heroImageUrl && existing.heroImageUrl !== heroImageUrl) {
          deleteCloudinaryImage(existing.heroImageUrl);
        }

        // --- Diff Sync: Access Types ---
        const currentAccessTypes = await tx
          .select()
          .from(accessTypesTable)
          .where(eq(accessTypesTable.eventId, eventId));
        const currentAccessTypeIds = currentAccessTypes.map(r => r.id);
        const inputAccessTypeIds = (accessTypes ?? []).map(a => a.id).filter(Boolean);

        const accessTypesToDelete = currentAccessTypeIds.filter(id => !inputAccessTypeIds.includes(id));
        const accessTypesToUpdate = (accessTypes ?? []).filter(a => a.id && currentAccessTypeIds.includes(a.id));
        const accessTypesToInsert = (accessTypes ?? []).filter(a => !a.id);

        if (accessTypesToDelete.length) {
          await tx.delete(accessTypesTable).where(inArray(accessTypesTable.id, accessTypesToDelete));
        }

        for (const a of accessTypesToUpdate) {
          const idx = accessTypes!.indexOf(a);
          await tx.update(accessTypesTable)
            .set({ title: a.title, price: a.price, pointCost: a.pointCost, order: idx })
            .where(eq(accessTypesTable.id, a.id!));
        }

        if (accessTypesToInsert.length) {
          await tx.insert(accessTypesTable).values(
            accessTypesToInsert.map(a => {
              const idx = accessTypes!.indexOf(a);
              return { eventId, title: a.title, price: a.price, pointCost: a.pointCost, order: idx };
            })
          );
        }

        // --- Diff Sync: Timeline Items ---
        const currentTimelineItems = await tx
          .select()
          .from(timelineItemsTable)
          .where(eq(timelineItemsTable.eventId, eventId));
        const currentTimelineIds = currentTimelineItems.map(r => r.id);
        const inputTimelineIds = (timelineItems ?? []).map(t => t.id).filter(Boolean);

        const timelineToDelete = currentTimelineIds.filter(id => !inputTimelineIds.includes(id));
        const timelineToUpdate = (timelineItems ?? []).filter(t => t.id && currentTimelineIds.includes(t.id));
        const timelineToInsert = (timelineItems ?? []).filter(t => !t.id);

        if (timelineToDelete.length) {
          await tx.delete(timelineItemsTable).where(inArray(timelineItemsTable.id, timelineToDelete));
        }

        for (const t of timelineToUpdate) {
          const idx = timelineItems!.indexOf(t);
          await tx.update(timelineItemsTable)
            .set({ time: t.time, description: t.description, order: idx })
            .where(eq(timelineItemsTable.id, t.id!));
        }

        if (timelineToInsert.length) {
          await tx.insert(timelineItemsTable).values(
            timelineToInsert.map(t => {
              const idx = timelineItems!.indexOf(t);
              return { eventId, time: t.time, description: t.description, order: idx };
            })
          );
        }

        // --- Diff Sync: Content Sections (with nested media items) ---
        const currentSections = await tx
          .select()
          .from(contentSectionsTable)
          .where(eq(contentSectionsTable.eventId, eventId));
        const currentSectionIds = currentSections.map(s => s.id);
        const inputSectionIds = (contentSections ?? []).map(s => s.id).filter(Boolean);

        const sectionsToDelete = currentSectionIds.filter(id => !inputSectionIds.includes(id));
        const sectionsToUpdate = (contentSections ?? []).filter(s => s.id && currentSectionIds.includes(s.id));
        const sectionsToInsert = (contentSections ?? []).filter(s => !s.id);

        if (sectionsToDelete.length) {
          await tx.delete(contentSectionsTable).where(inArray(contentSectionsTable.id, sectionsToDelete));
        }

        for (const section of sectionsToUpdate) {
          const idx = contentSections!.indexOf(section);
          await tx.update(contentSectionsTable)
            .set({ type: section.type, content: section.content, order: idx })
            .where(eq(contentSectionsTable.id, section.id!));

          await syncMediaItems(tx, section.id!, section.mediaItems || []);
        }

        for (const section of sectionsToInsert) {
          const idx = contentSections!.indexOf(section);
          const [newSection] = await tx.insert(contentSectionsTable).values({
            eventId,
            type: section.type,
            content: section.content || "",
            order: idx,
          }).returning();

          if (section.type === "media" && section.mediaItems?.length) {
            await tx.insert(mediaItemsTable).values(
              section.mediaItems.map((m, mIdx) => ({
                sectionId: newSection.id,
                url: m.url,
                order: mIdx,
              }))
            );
          }
        }
      } else {
        const [newEvent] = await tx
          .insert(eventsTable)
          .values({ title, eventType, status, priority, eventDate, venue, description, heroImageUrl, imageType, eventTime, accentColor: accentColor || "#FACC15", youtubeUrl: normalizedYoutubeUrl })
          .returning();

        finalEvent = newEvent;
        eventId = newEvent.id;

        if (accessTypes?.length) {
          await tx.insert(accessTypesTable).values(
            accessTypes.map((a, idx) => ({
              eventId,
              title: a.title,
              price: a.price,
              pointCost: a.pointCost,
              order: idx,
            })),
          );
        }

        if (timelineItems?.length) {
          await tx.insert(timelineItemsTable).values(
            timelineItems.map((t, idx) => ({
              eventId,
              time: t.time,
              description: t.description,
              order: idx,
            })),
          );
        }

        if (contentSections?.length) {
          for (let i = 0; i < contentSections.length; i++) {
            const section = contentSections[i];
            const [newSection] = await tx
              .insert(contentSectionsTable)
              .values({ eventId, type: section.type, content: section.content || "", order: i })
              .returning();

            if (section.type === "media" && section.mediaItems?.length) {
              await tx.insert(mediaItemsTable).values(
                section.mediaItems.map((m, mIdx) => ({
                  sectionId: newSection.id,
                  url: m.url,
                  order: mIdx,
                })),
              );
            }
          }
        }
      }

      return finalEvent;
    });

    revalidatePath("/events");

    return ok(result);
  },

  async deleteEvent(eventId: number): Promise<ServiceResult<{ message: string }>> {
    const [eventRow] = await db
      .select({ heroImageUrl: eventsTable.heroImageUrl })
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId));

    const sectionIds = await db
      .select({ id: contentSectionsTable.id })
      .from(contentSectionsTable)
      .where(eq(contentSectionsTable.eventId, eventId));

    const mediaUrls = sectionIds.length
      ? await db
          .select({ url: mediaItemsTable.url })
          .from(mediaItemsTable)
          .where(inArray(mediaItemsTable.sectionId, sectionIds.map((s) => s.id)))
      : [];

    const [deleted] = await db
      .delete(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .returning();

    if (!deleted) return fail("Event not found", 404);

    if (eventRow?.heroImageUrl) deleteCloudinaryImage(eventRow.heroImageUrl);
    for (const { url } of mediaUrls) deleteCloudinaryImage(url);

    revalidatePath("/events");
    return ok({ message: "Event deleted successfully" });
  },
};