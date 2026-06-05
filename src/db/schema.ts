import { integer, pgTable, varchar, text, timestamp, serial, boolean, index, AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

// --- Events Tables ---

export const eventsTable = pgTable("events", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 100 }).notNull(),
    eventDate: timestamp("event_date").notNull(),
    venue: varchar("venue", { length: 255 }),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const contentSectionsTable = pgTable("content_sections", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
    type: varchar("type", { length: 50 }).notNull(),
    content: text("content"),
    order: integer("order").notNull(),
});

export const mediaItemsTable = pgTable("media_items", {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id").notNull().references(() => contentSectionsTable.id, { onDelete: 'cascade' }),
    url: text("url").notNull(),
    order: integer("order").notNull(),
});

export const accessTypesTable = pgTable("access_types", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    price: varchar("price", { length: 100 }).notNull(),
    order: integer("order").notNull(),
});

export const timelineItemsTable = pgTable("timeline_items", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
    time: varchar("time", { length: 100 }).notNull(),
    description: text("description").notNull(),
    order: integer("order").notNull(),
});

// --- Relations ---

export const eventsRelations = relations(eventsTable, ({ many }) => ({
    contentSections: many(contentSectionsTable),
    accessTypes: many(accessTypesTable),
    timelineItems: many(timelineItemsTable),
    userTickets: many(userTicketsTable),
}));

export const contentSectionsRelations = relations(contentSectionsTable, ({ one, many }) => ({
    event: one(eventsTable, {
        fields: [contentSectionsTable.eventId],
        references: [eventsTable.id],
    }),
    mediaItems: many(mediaItemsTable),
}));

export const mediaItemsRelations = relations(mediaItemsTable, ({ one }) => ({
    section: one(contentSectionsTable, {
        fields: [mediaItemsTable.sectionId],
        references: [contentSectionsTable.id],
    }),
}));

export const accessTypesRelations = relations(accessTypesTable, ({ one }) => ({
    event: one(eventsTable, {
        fields: [accessTypesTable.eventId],
        references: [eventsTable.id],
    }),
}));

export const timelineItemsRelations = relations(timelineItemsTable, ({ one }) => ({
    event: one(eventsTable, {
        fields: [timelineItemsTable.eventId],
        references: [eventsTable.id],
    }),
}));


// --- User Table ----

export const usersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: text("password"),
    image: text("image"),
    phoneNumber: varchar("phone_number", { length: 255 }).unique(),
    bio: text("bio"),
    location: text("location"),
    provider: text("provider").notNull().default("credentials"),
    googleId: varchar("google_id", { length: 255 }).unique(),
    facebookId: varchar("facebook_id", { length: 255 }),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    points: integer("points").notNull().default(0),
    completedTasksCount: integer("completed_tasks_count").notNull().default(0),
    referralCode: varchar("referral_code", { length: 20 }).unique(),
    dailyLoginDate: timestamp("daily_login_date"),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
    rank: varchar("rank", { length: 255 }).default("Iron"),
    lifetimePoints: integer("lifetime_points").notNull().default(0),
    referredBy: integer("referred_by").references((): AnyPgColumn => usersTable.id),
    referralRewarded: boolean("referral_rewarded").default(false),

})

// --- Task Table -----
export const tasksTable = pgTable("tasks", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    taskType: varchar("task_type", { length: 50 }),
    points: integer("points").notNull().default(10),
    postUrl: text("post_url"),
    platform: varchar("platform", { length: 100 }),
    socialPostId: varchar("social_post_id", { length: 255 }),
    socialPlatform: varchar("social_platform", { length: 50 }),
    targetUrl: text("target_url"),
    isActive: boolean("is_active").default(true),
    watchDuration: integer("watch_duration"),
    difficulty: varchar("difficulty", { length: 20 }).notNull().default("easy"),
    expiresAt: timestamp("expires_at"),
    isFlash: boolean("is_flash").default(false).notNull(),
    isShare: boolean("is_share").default(false).notNull(),
    shareThreshold: integer("share_threshold").default(3),
    createdAt: timestamp("created_at").defaultNow(),
    createdByAdminId: integer("admin_id").references(() => usersTable.id),
})

export const userTasksTable = pgTable("user_tasks", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    taskId: integer("task_id").references(() => tasksTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    proofImageUrl: text("proof_image_url"),
    proofUrl: text("proof_url"),
    assignedAt: timestamp("assigned_at").defaultNow(),
    completedAt: timestamp("completed_at"),
}, (table) => ({
    userIdIdx: index("idx_user_tasks_user_id").on(table.userId),
    taskIdIdx: index("idx_user_tasks_task_id").on(table.taskId),
    statusIdx: index("idx_user_tasks_status").on(table.status),
}))

export const userTicketsTable = pgTable("user_tickets", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "cascade" }),
    accessTypeId: integer("access_type_id").references(() => accessTypesTable.id, { onDelete: "set null" }),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    redeemedAt: timestamp("redeemed_at"),
    redemptionToken: varchar("redemption_token", { length: 255 }).notNull().unique().$defaultFn(() => crypto.randomUUID()),
    redeemedBy: integer("redeemed_by").references(() => usersTable.id),
}, (table) => ({
    userIdIdx: index("idx_user_tickets_user_id").on(table.userId),
    eventIdIdx: index("idx_user_tickets_event_id").on(table.eventId),
}));

export const referralsTable = pgTable("referrals", {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    referredId: integer("referred_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    pointsAwarded: integer("points_awarded").default(0),
    createdAt: timestamp("created_at").defaultNow(),
});

// --- Points Log ---
export const pointsLogTable = pgTable("points_log", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    taskId: integer("task_id").references(() => tasksTable.id),
    points: integer("points").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
});

// --- Watch Sessions ---
export const watchSessionsTable = pgTable("watch_sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    taskId: integer("task_id").notNull().references(() => tasksTable.id),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
    lastCheckpointAt: timestamp("last_checkpoint_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

// --- Rate Limits ---
export const rateLimitsTable = pgTable("rate_limits", {
    key: varchar("key", { length: 255 }).primaryKey(),
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// --- Deals / Rewards ---
export const dealsTable = pgTable("deals", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    pointsCost: integer("points_cost").notNull(),
    discountType: varchar("discount_type", { length: 20 }).notNull().default("percent"),
    discountValue: integer("discount_value").notNull().default(0),
    discountMaxAmount: integer("discount_max_amount"),
    imageUrl: text("image_url"),
    stock: integer("stock"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

export const dealCodesTable = pgTable("deal_codes", {
    id: serial("id").primaryKey(),
    dealId: integer("deal_id").notNull().references(() => dealsTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    isRedeemed: boolean("is_redeemed").notNull().default(false),
    redeemedAt: timestamp("redeemed_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const redemptionsTable = pgTable("redemptions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    dealId: integer("deal_id").notNull().references(() => dealsTable.id),
    pointsSpent: integer("points_spent").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    revealedCode: text("revealed_code"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
    userTasks: many(userTasksTable),
    userTickets: many(userTicketsTable),
    pointsLog: many(pointsLogTable),
    watchSessions: many(watchSessionsTable),
}));
export const tasksRelations = relations(tasksTable, ({ many, one }) => ({
    userTasks: many(userTasksTable),
    creator: one(usersTable, {
        fields: [tasksTable.createdByAdminId],
        references: [usersTable.id]
    })
}));
export const userTasksRelations = relations(userTasksTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [userTasksTable.userId],
        references: [usersTable.id],
    }),
    task: one(tasksTable, {
        fields: [userTasksTable.taskId],
        references: [tasksTable.id],
    })
}));

export const userTicketsRelations = relations(userTicketsTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [userTicketsTable.userId],
        references: [usersTable.id],
    }),
    event: one(eventsTable, {
        fields: [userTicketsTable.eventId],
        references: [eventsTable.id],
    }),
    accessType: one(accessTypesTable, {
        fields: [userTicketsTable.accessTypeId],
        references: [accessTypesTable.id],
    }),
    redeemer: one(usersTable, {
        fields: [userTicketsTable.redeemedBy],
        references: [usersTable.id],
    }),
}));

export const shareTasksTable = pgTable("share_tasks", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").references(() => tasksTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    shareCode: varchar("share_code", { length: 20 }).notNull().unique(),
    targetUrl: text("target_url").notNull().default(""),
    shareUrl: text("share_url").notNull(),
    ownerFingerprint: varchar("owner_fingerprint", { length: 255 }),
    clickCount: integer("click_count").notNull().default(0),
    uniqueClicks: integer("unique_clicks").notNull().default(0),
    pointsAwarded: boolean("points_awarded").notNull().default(false),
    clickThreshold: integer("click_threshold").notNull().default(3),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});

export const shareClicksTable = pgTable("share_clicks", {
    id: serial("id").primaryKey(),
    shareCode: varchar("share_code", { length: 20 }).notNull(),
    visitorIp: varchar("visitor_ip", { length: 50 }),
    fingerprint: varchar("fingerprint", { length: 255 }),
    userAgent: varchar("user_agent", { length: 500 }),
    clickedAt: timestamp("clicked_at").defaultNow(),
});

export const referralsRelations = relations(referralsTable, ({ one }) => ({
    referrer: one(usersTable, {
        fields: [referralsTable.referrerId],
        references: [usersTable.id],
    }),
    referred: one(usersTable, {
        fields: [referralsTable.referredId],
        references: [usersTable.id],
    }),
}));

export const pointsLogRelations = relations(pointsLogTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [pointsLogTable.userId],
        references: [usersTable.id],
    }),
    task: one(tasksTable, {
        fields: [pointsLogTable.taskId],
        references: [tasksTable.id],
    }),
}));

export const watchSessionsRelations = relations(watchSessionsTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [watchSessionsTable.userId],
        references: [usersTable.id],
    }),
    task: one(tasksTable, {
        fields: [watchSessionsTable.taskId],
        references: [tasksTable.id],
    }),
}));

export const dealsRelations = relations(dealsTable, ({ many }) => ({
    codes: many(dealCodesTable),
    redemptions: many(redemptionsTable),
}));

export const dealCodesRelations = relations(dealCodesTable, ({ one }) => ({
    deal: one(dealsTable, {
        fields: [dealCodesTable.dealId],
        references: [dealsTable.id],
    }),
}));

export const redemptionsRelations = relations(redemptionsTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [redemptionsTable.userId],
        references: [usersTable.id],
    }),
    deal: one(dealsTable, {
        fields: [redemptionsTable.dealId],
        references: [dealsTable.id],
    }),
}));