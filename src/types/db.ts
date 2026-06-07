import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  eventsTable,
  contentSectionsTable,
  mediaItemsTable,
  accessTypesTable,
  timelineItemsTable,
  usersTable,
  tasksTable,
  userTasksTable,
  userTicketsTable,
  referralsTable,
  shareTasksTable,
  shareClicksTable,
  youtubeSessionsTable,
} from "@/src/db/schema";

export type Event = InferSelectModel<typeof eventsTable>;
export type NewEvent = InferInsertModel<typeof eventsTable>;

export type ContentSection = InferSelectModel<typeof contentSectionsTable>;
export type MediaItem = InferSelectModel<typeof mediaItemsTable>;
export type AccessType = InferSelectModel<typeof accessTypesTable>;
export type TimelineItem = InferSelectModel<typeof timelineItemsTable>;

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;

export type Task = InferSelectModel<typeof tasksTable>;
export type NewTask = InferInsertModel<typeof tasksTable>;

export type UserTask = InferSelectModel<typeof userTasksTable>;
export type NewUserTask = InferInsertModel<typeof userTasksTable>;

export type UserTicket = InferSelectModel<typeof userTicketsTable>;
export type NewUserTicket = InferInsertModel<typeof userTicketsTable>;

export type Referral = InferSelectModel<typeof referralsTable>;
export type ShareTask = InferSelectModel<typeof shareTasksTable>;
export type ShareClick = InferSelectModel<typeof shareClicksTable>;
export type YoutubeSession = InferSelectModel<typeof youtubeSessionsTable>;
export type NewYoutubeSession = InferInsertModel<typeof youtubeSessionsTable>;
