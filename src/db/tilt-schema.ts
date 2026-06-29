import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Table for Tilt users ────────────────────────────────────────────────────
export const tiltUsersTable = pgTable("tilt_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  role: varchar("role", { length: 50 }).notNull().default("outlet"),
  address: text("address"),
});

// ── Table for Tilt registrations ────────────────────────────────────────────
export const tiltRegistrationsTable = pgTable(
  "tilt_registrations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => tiltUsersTable.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 50 }).notNull().unique(),
    address: text("address").notNull(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tilt_registrations_email_idx").on(table.email),
    uniqueIndex("tilt_registrations_phone_idx").on(table.phone),
  ],
);

export const invitedOutletsTable = pgTable("invited_outlets", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lotteryCampaignsTable = pgTable("lottery_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  outletId: text("outlet_id").notNull(), // TODO: FK to outlets
  name: text("name").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  outletIdx: index("idx_lottery_campaigns_outlet").on(table.outletId),
  datesIdx: index("idx_lottery_campaigns_dates").on(table.startsAt, table.endsAt),
}));

export const qrTokensTable = pgTable(
  "qr_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => lotteryCampaignsTable.id, { onDelete: "cascade" }),
    outletId: text("outlet_id").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("qr_tokens_token_idx").on(table.token),
    index("qr_tokens_session_id_idx").on(table.sessionId),
    index("idx_qr_tokens_outlet").on(table.outletId),
    index("idx_qr_tokens_campaign").on(table.campaignId),
  ],
);

export const lotterySessionsTable = pgTable("lottery_sessions", {
  id: text("id").primaryKey(),
  tokenId: uuid("token_id")
    .notNull()
    .references(() => qrTokensTable.id),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => lotteryCampaignsTable.id),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("idx_lottery_sessions_token").on(table.tokenId),
  campaignIdx: index("idx_lottery_sessions_campaign").on(table.campaignId),
}));

export const lotteryEntriesTable = pgTable(
  "lottery_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => lotteryCampaignsTable.id),
    sessionId: text("session_id")
      .notNull()
      .unique()
      .references(() => lotterySessionsTable.id),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phonePlain: text("phone_plain").notNull(),
    phoneHash: text("phone_hash").notNull(),
    address: text("address").notNull(),
    flagged: boolean("flagged").default(false).notNull(),
    flagReason: text("flag_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("lottery_entries_campaign_email_idx").on(
      table.campaignId,
      table.email,
    ),
    index("lottery_entries_campaign_phone_hash_idx").on(
      table.campaignId,
      table.phoneHash,
    ),
  ],
);

export const instantRewardsTable = pgTable(
  "instant_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .unique()
      .references(() => lotteryEntriesTable.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .unique()
      .references(() => lotterySessionsTable.id),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => lotteryCampaignsTable.id),
    outletId: text("outlet_id").notNull(), // denormalized so per-outlet counts don't need joins
    claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  },
  (table) => [
    index("instant_rewards_claimed_at_idx").on(table.claimedAt),
    index("instant_rewards_outlet_idx").on(table.outletId, table.claimedAt),
  ],
);
