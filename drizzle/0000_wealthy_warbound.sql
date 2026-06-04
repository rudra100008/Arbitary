CREATE TABLE "access_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"price" varchar(100) NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"status" varchar(100) NOT NULL,
	"event_date" text NOT NULL,
	"venue" varchar(255),
	"description" text,
	"hero_image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"url" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"task_type" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "timeline_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"time" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"task_id" integer,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"proof_image_url" text,
	"assigned_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"password" text,
	"image" text,
	"provider" text DEFAULT 'credentials' NOT NULL,
	"google_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "access_types" ADD CONSTRAINT "access_types_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_section_id_content_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."content_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;