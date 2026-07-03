import { integer, pgTable, varchar, text, timestamp, serial, boolean, index, unique, AnyPgColumn, jsonb } from "drizzle-orm/pg-core";
import { desc, relations } from 'drizzle-orm';

// --- Events Tables ---

export const eventsTable = pgTable("events", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 100 }).notNull(),
    /** "high" events render as the large hero banner on /events and always sort
     *  above "low" events, which render as compact 3-up grid cards. */
    priority: varchar("priority", { length: 10 }).notNull().default("low"),
    eventDate: timestamp("event_date").notNull(),
    venue: varchar("venue", { length: 255 }),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    youtubeUrl: text("youtube_url"),
    /** "poster" = a designed graphic with its own baked-in title/branding
     *  (rendered full-clarity, no overlay text). "photo" = a plain
     *  background photo (rendered with the title/badge overlay + gradient,
     *  as before). */
    imageType: varchar("image_type", { length: 50 }).notNull().default("photo"),
    /** Free-text display time, e.g. "10 AM - 4 PM". Nullable since older
     *  events won't have this set. */
    eventTime: varchar("event_time", { length: 100 }),
    /** Hex color used to theme this event's page (badges, chips, timeline,
     *  active nav state). Defaults to the site's existing yellow. */
    accentColor: varchar("accent_color", { length: 50 }).notNull().default("#FACC15"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    eventDateIdx: index("idx_events_event_date").on(desc(table.eventDate)),
}));

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
    pointCost: integer("point_cost").notNull().default(0),
    order: integer("order").notNull(),
});

export const timelineItemsTable = pgTable("timeline_items", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
    time: varchar("time", { length: 100 }).notNull(),
    description: text("description").notNull(),
    order: integer("order").notNull(),
});

// --- User Table ----

export const usersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: text("password"),
    image: text("image"),
    phoneNumber: varchar("phone_number", { length: 255 }).unique(),
    bio: text("bio"),
    location: text("Location"),
    instagramUsername: varchar("instagram_username", { length: 255 }),
    /** Required going forward at the application layer (see age.ts /
     *  requireEligibleParticipant). Nullable at the DB level since existing
     *  users predate this field — null values trigger the mandatory
     *  /complete-birthday backfill redirect. */
    dateOfBirth: timestamp("date_of_birth"),
    provider: text("provider").notNull().default("credentials"),
    googleId: varchar("google_id", { length: 255 }).unique(),
    googleRefreshToken: text("google_refresh_token"),
    facebookId: varchar("facebook_id", { length: 255 }),
    googleImage: text("google_image"),
    facebookImage: text("facebook_image"),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    points: integer("points").notNull().default(0),
    completedTasksCount: integer("completed_tasks_count").notNull().default(0),
    referralCode: varchar("referral_code", { length: 20 }).unique(),
    dailyLoginDate: timestamp("daily_login_date"),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
    monthlyPoints: integer("monthly_points").notNull().default(0),
    referredBy: integer("referred_by").references((): AnyPgColumn => usersTable.id),
    referralRewarded: boolean("referral_rewarded").default(false),
    isVerified: boolean("Is_Verified").default(false).notNull(),
    verificationToken: text("verification_token"),
    verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
    fraudRiskScore: integer("fraud_risk_score").notNull().default(0),
    isFlagged: boolean("is_flagged").notNull().default(false),
    signupFingerprint: varchar("signup_fingerprint", { length: 255 }),
    /** Set at signup when a duplicate device fingerprint is detected. Independent of
     *  fraudRiskScore/isFlagged-from-behavior so FraudService's recompute can't silently
     *  un-flag it. isFlagged = (behavioral riskScore > threshold) OR this. */
    signupFingerprintFlagged: boolean("signup_fingerprint_flagged").notNull().default(false),
    /** When set to a future timestamp, suppresses re-flagging in getFraudReport()
     *  even if recomputed behavioral signals still exceed the threshold. Set by
     *  clearFlags() to DISMISS_SUPPRESSION_DAYS from now; cleared (or simply expires)
     *  once the suppression window passes. */
    dismissedUntil: timestamp("dismissed_until"),
}, (table) => ({
    lastLoginAtIdx: index("idx_users_last_login_at").on(table.lastLoginAt),
    fraudRiskScoreIdx: index("idx_users_fraud_risk_score").on(table.fraudRiskScore),
    isFlaggedIdx: index("idx_users_is_flagged").on(table.isFlagged),
    monthlyPointsIdx: index("idx_users_monthly_points").on(desc(table.monthlyPoints)),
}))

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
    /** true = Daily Refresh (resets at midnight), false = Permanent (one-time only) */
    isRecurring: boolean("is_recurring").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    createdByAdminId: integer("admin_id").references(() => usersTable.id),
}, (table) => ({
    createdAtIdx: index("idx_tasks_created_at").on(desc(table.createdAt)),
    isActiveCreatedIdx: index("idx_tasks_is_active_created").on(table.isActive, desc(table.createdAt)),
    taskTypeActiveIdx: index("idx_tasks_type_active").on(table.taskType, table.isActive),
}))

export const userTasksTable = pgTable("user_tasks", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id),
    taskId: integer("task_id").references(() => tasksTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    proofImageUrl: text("proof_image_url"),
    proofUrl: text("proof_url"),
    assignedAt: timestamp("assigned_at").defaultNow(),
    /** When the user submitted proof for verification (status -> "Pending Verification") */
    submittedAt: timestamp("submitted_at"),
    completedAt: timestamp("completed_at"),
    submissionFingerprint: varchar("submission_fingerprint", { length: 255 }),
    completionDurationSeconds: integer("completion_duration_seconds"),
    /** 16-char hex dHash for duplicate-image detection */
    proofPhash: varchar("proof_phash", { length: 16 }),
    /** JSON blob of ExifFlags — stored so admins can see it without re-parsing */
    proofExifFlags: text("proof_exif_flags"),
    /** true if pHash matched an existing submission at upload time */
    isDuplicateProof: boolean("is_duplicate_proof").default(false),
    /** Admin-provided reason when status is set to "Rejected" */
    rejectionReason: text("rejection_reason"),
    /** Timestamp of the most recent rejection */
    rejectedAt: timestamp("rejected_at"),
}, (table) => ({
    userIdIdx: index("idx_user_tasks_user_id").on(table.userId),
    taskIdIdx: index("idx_user_tasks_task_id").on(table.taskId),
    statusIdx: index("idx_user_tasks_status").on(table.status),
    compositeIdx: index("idx_user_tasks_composite").on(table.userId, table.taskId, table.status),
}))

/**
 * Server-side persisted image analysis, written at upload time (/api/upload)
 * while the server still has the raw buffer in memory. Task submission looks
 * this up by publicId instead of trusting client-submitted phash/EXIF values —
 * closes the bypass where a client could fabricate its own "clean" analysis.
 * Not a drizzle relation: looked up by publicId (parsed from the Cloudinary
 * URL), not joined via foreign key.
 */
export const uploadAnalysisTable = pgTable("upload_analysis", {
    id: serial("id").primaryKey(),
    /** Cloudinary public_id for the uploaded asset, e.g. "42_1718980000000" */
    publicId: varchar("public_id", { length: 255 }).notNull().unique(),
    /** Owner of the upload, for a defense-in-depth ownership check at lookup time */
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    /** 16-char hex dHash, server-computed */
    phash: varchar("phash", { length: 16 }),
    /** JSON blob of ExifFlags, server-computed */
    exifFlags: text("exif_flags"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    publicIdIdx: index("idx_upload_analysis_public_id").on(table.publicId),
}));

/**
 * Permanent history log for Daily Refresh task completions.
 * One row is appended every time a user completes a recurring task —
 * records are NEVER deleted so analytics always have the full picture.
 */
export const dailyTaskCompletionsTable = pgTable("daily_task_completions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
    /** Which calendar date (UTC) this completion belongs to */
    completionDate: varchar("completion_date", { length: 10 }).notNull(), // YYYY-MM-DD
    pointsAwarded: integer("points_awarded").notNull().default(0),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
    userTaskIdx: index("idx_dtc_user_task").on(table.userId, table.taskId),
    taskDateIdx: index("idx_dtc_task_date").on(table.taskId, table.completionDate),
    userDateIdx: index("idx_dtc_user_date").on(table.userId, table.completionDate),
    // Prevents duplicate point awards for the same recurring task on the same calendar day
    uniqueCompletion: unique("uq_dtc_user_task_date").on(table.userId, table.taskId, table.completionDate),
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
}, (table) => ({
    referrerIdx: index("idx_referrals_referrer").on(table.referrerId),
}));

// --- Points Log ---
export const pointsLogTable = pgTable("points_log", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    taskId: integer("task_id").references(() => tasksTable.id),
    points: integer("points").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    userCreatedAtIdx: index("idx_points_log_user_id_created_at").on(table.userId, table.createdAt),
}));
export const watchSessionsTable = pgTable("watch_sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    taskId: integer("task_id").notNull().references(() => tasksTable.id),
    videoDuration: integer("video_duration").notNull().default(0),
    accumulatedWatchTime: integer("accumulated_watch_time").notNull().default(0),
    lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
    lastCheckpointAt: timestamp("last_checkpoint_at"),
    heartbeatLog: jsonb("heartbeat_log").default([]),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

// --- Daily Login ---
export const dailyLoginTable = pgTable("daily_logins", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
    claimedAt: timestamp("claimed_at").notNull(),
    streak: integer("streak").notNull().default(1),
}, (table) => ({
    userIdIdx: index("idx_daily_logins_user_id").on(table.userId),
}));

// --- Rate Limits ---
export const rateLimitsTable = pgTable("rate_limits", {
    key: varchar("key", { length: 255 }).primaryKey(),
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
    expiresAtIdx: index("idx_rate_limits_expires").on(table.expiresAt),
}));

// --- Password Reset Tokens ---
export const passwordResetTokensTable = pgTable("password_reset_tokens", {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
    claimedBy: integer("claimed_by").references(() => usersTable.id),
    claimedAt: timestamp("claimed_at"),
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

// --- Share Tasks (anti-cheat) ---
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


export const recordsTable = pgTable("records", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    artist: varchar("artist", { length: 255 }).notNull(),
    releaseMonth: integer("release_month"),
    releaseYear: integer("release_year"),
    genre: varchar("genre", { length: 100 }),
    coverImageUrl: text("cover_image_url"),
    labelColor: varchar("label_color", { length: 7 }),
    youtubeUrl: text("youtube_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Partners / Our Work ---
export const partnersTable = pgTable("partners", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    logoUrl: text("logo_url"),
    description: text("description"),
    websiteUrl: text("website_url"),
    category: varchar("category", { length: 50 }),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Team Members ---
export const teamMembersTable = pgTable("team_members", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 255 }).notNull(),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- About Content (Singleton) ---
export const aboutContentTable = pgTable("about_content", {
    id: serial("id").primaryKey(),
    tagline: varchar("tagline", { length: 255 }),
    heading: varchar("heading", { length: 255 }),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    projectsCount: varchar("projects_count", { length: 50 }),
    projectsLabel: varchar("projects_label", { length: 255 }),
    awardsCount: varchar("awards_count", { length: 50 }),
    awardsLabel: varchar("awards_label", { length: 255 }),
    motto: text("motto"),
    mottoAuthor: varchar("motto_author", { length: 255 }),
    liveStreamId: varchar("live_stream_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Live Watch Sessions ---
export const liveWatchSessionsTable = pgTable("live_watch_sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    youtubeId: varchar("youtube_id", { length: 255 }).notNull(),
    accumulatedSeconds: integer("accumulated_seconds").notNull().default(0),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    lastHeartbeatAt: timestamp("last_heartbeat_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Admin Activity Log ---
export const adminActivityLogsTable = pgTable("admin_activity_logs", {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").notNull().references(() => usersTable.id),
    action: text("action").notNull(),
    description: text("description").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    logLevel: varchar("log_level", { length: 20 }).notNull().default("INFO"),
    createdAt: timestamp("created_at").defaultNow(),
});

// --- Notifications ---
// Scalable, reusable notification model: every event (submission rejected /
// approved, points awarded, new task assigned, tier upgrade, event
// announcements, ...) is stored as a row here and pushed to the user in
// real-time via SSE (see /api/notifications/subscribe) and persisted for the
// in-app notification center.
export const notificationsTable = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    /** e.g. "submission_rejected", "submission_approved", "points_awarded", "task_assigned", "tier_upgrade", "event_announcement" */
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    /** Arbitrary structured payload (taskName, reason, points, etc.) for rendering rich notifications */
    data: jsonb("data"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index("idx_notifications_user_id").on(table.userId),
    userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.isRead),
    createdAtIdx: index("idx_notifications_created_at").on(table.createdAt),
}));


export const participantSubmissionsTable = pgTable("participant_submission", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: 'cascade' }),

    category: varchar("category", { length: 20 }).notNull(), // for now music , dance
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phoneNumber", { length: 255 }),
    mediaUrl: text("media_url").notNull(), // social post/video URL (or legacy cloudinary secure_url)
    mediaPlatform: varchar("media_platform", { length: 20 }).notNull(), // "youtube" | "instagram" | "facebook" | "legacy_upload"

    status: varchar("status", { length: 255 }).notNull().default("pending"), // pending, approved, rejected

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    rejectedReason: varchar("rejected_reason", { length: 255 })
}, (table) => ({
    userIdx: index("idx_participant_submission_user_id").on(table.userId),
    categoryIdx: index("idx_participant_submission_category").on(table.category),
    statusIdx: index("idx_participant_submission_status").on(table.status),
    email: index("idx_participant_submission_email").on(table.email),
    createdAtIdx: index("idx_participant_submission_created_at").on(table.createdAt),
    updatedAtIdx: index("idx_participant_submission_updated_at").on(table.updatedAt),

}))

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

export const usersRelations = relations(usersTable, ({ many, one }) => ({
    userTasks: many(userTasksTable),
    userTickets: many(userTicketsTable),
    pointsLog: many(pointsLogTable),
    watchSessions: many(watchSessionsTable),
    liveWatchSessions: many(liveWatchSessionsTable),
    notifications: many(notificationsTable),
    dailyLogin: one(dailyLoginTable, {
        fields: [usersTable.id],
        references: [dailyLoginTable.userId],
    }),
}));

export const dailyLoginRelations = relations(dailyLoginTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [dailyLoginTable.userId],
        references: [usersTable.id],
    }),
}));

export const tasksRelations = relations(tasksTable, ({ many, one }) => ({
    userTasks: many(userTasksTable),
    dailyTaskCompletions: many(dailyTaskCompletionsTable),
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

export const dailyTaskCompletionsRelations = relations(dailyTaskCompletionsTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [dailyTaskCompletionsTable.userId],
        references: [usersTable.id],
    }),
    task: one(tasksTable, {
        fields: [dailyTaskCompletionsTable.taskId],
        references: [tasksTable.id],
    }),
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

export const liveWatchSessionsRelations = relations(liveWatchSessionsTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [liveWatchSessionsTable.userId],
        references: [usersTable.id],
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

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
    user: one(usersTable, {
        fields: [notificationsTable.userId],
        references: [usersTable.id],
    }),
}));