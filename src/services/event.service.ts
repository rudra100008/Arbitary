import { db } from "@/src/db";
import {
  eventsTable,
  contentSectionsTable,
  mediaItemsTable,
  accessTypesTable,
  timelineItemsTable,
} from "@/src/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { eventSchema } from "@/src/lib/validations/event";
import { ServiceResult, ok, fail, failWithDetails } from "./result";
import type { Event, ContentSection, MediaItem, AccessType, TimelineItem } from "@/src/types/db";

type EventWithRelations = Event & {
  accessTypes: AccessType[];
  timelineItems: TimelineItem[];
  contentSections: (ContentSection & { mediaItems: MediaItem[] })[];
};

export type EventListItem = Pick<
  Event,
  "id" | "title" | "eventType" | "status" | "eventDate" | "venue" | "description" | "heroImageUrl" | "createdAt"
>;

export const EventService = {
  async getEvents(): Promise<ServiceResult<EventListItem[]>> {
    const events = await db
      .select({
        id: eventsTable.id,
        title: eventsTable.title,
        eventType: eventsTable.eventType,
        status: eventsTable.status,
        eventDate: eventsTable.eventDate,
        venue: eventsTable.venue,
        description: eventsTable.description,
        heroImageUrl: eventsTable.heroImageUrl,
        createdAt: eventsTable.createdAt,
      })
      .from(eventsTable)
      .orderBy(desc(eventsTable.eventDate));

    return ok(events);
  },

  async getEventById(eventId: number): Promise<ServiceResult<EventWithRelations>> {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) return fail("Event not found", 404);

    const [accessTypes, timelineItems, contentSectionsRaw] = await Promise.all([
      db
        .select()
        .from(accessTypesTable)
        .where(eq(accessTypesTable.eventId, eventId))
        .orderBy(accessTypesTable.order),
      db
        .select()
        .from(timelineItemsTable)
        .where(eq(timelineItemsTable.eventId, eventId))
        .orderBy(timelineItemsTable.order),
      db
        .select()
        .from(contentSectionsTable)
        .where(eq(contentSectionsTable.eventId, eventId))
        .orderBy(contentSectionsTable.order),
    ]);

    const sectionIds = contentSectionsRaw.map((s) => s.id);
    let allMediaItems: MediaItem[] = [];
    if (sectionIds.length > 0) {
      allMediaItems = await db
        .select()
        .from(mediaItemsTable)
        .where(inArray(mediaItemsTable.sectionId, sectionIds))
        .orderBy(mediaItemsTable.order);
    }

    const contentSections = contentSectionsRaw.map((section) => ({
      ...section,
      mediaItems: allMediaItems.filter((m) => m.sectionId === section.id),
    }));

    return ok({ ...event, accessTypes, timelineItems, contentSections });
  },

  async createOrUpdateEvent(
    input: unknown,
  ): Promise<ServiceResult<Event>> {
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) {
      return failWithDetails(
        "Validation failed",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        400,
      );
    }

    const { id, title, eventType, status, date, venue, description, heroImageUrl, contentSections, accessTypes, timelineItems } = parsed.data;

    const eventDate = date ? new Date(date) : new Date();

    const result = await db.transaction(async (tx) => {
      let eventId: number;
      let finalEvent: Event;

      if (id) {
        const [updated] = await tx
          .update(eventsTable)
          .set({ title, eventType, status, eventDate, venue, description, heroImageUrl })
          .where(eq(eventsTable.id, Number(id)))
          .returning();

        if (!updated) throw new Error(`Event ${id} not found`);
        finalEvent = updated;
        eventId = Number(id);

        await tx.delete(accessTypesTable).where(eq(accessTypesTable.eventId, eventId));
        await tx.delete(timelineItemsTable).where(eq(timelineItemsTable.eventId, eventId));
        await tx.delete(contentSectionsTable).where(eq(contentSectionsTable.eventId, eventId));
      } else {
        const [newEvent] = await tx
          .insert(eventsTable)
          .values({ title, eventType, status, eventDate, venue, description, heroImageUrl })
          .returning();

        finalEvent = newEvent;
        eventId = newEvent.id;
      }

      if (accessTypes?.length) {
        await tx.insert(accessTypesTable).values(
          accessTypes.map((a, idx) => ({
            eventId,
            title: a.title,
            price: a.price,
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

      return finalEvent;
    });

    return ok(result);
  },

  async deleteEvent(eventId: number): Promise<ServiceResult<{ message: string }>> {
    const [deleted] = await db
      .delete(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .returning();

    if (!deleted) return fail("Event not found", 404);
    return ok({ message: "Event deleted successfully" });
  },
};
