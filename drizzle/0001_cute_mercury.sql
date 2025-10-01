CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	"color" text,
	"requirements" jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personality_traits" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_id" text NOT NULL,
	"rapidity_meticulousness" integer NOT NULL,
	"flexibility_rigor" integer NOT NULL,
	"communicative_discreet" integer NOT NULL,
	"innovative_traditional" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_statistics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"avg_quality" real DEFAULT 0 NOT NULL,
	"avg_punctuality" real DEFAULT 0 NOT NULL,
	"avg_honesty" real DEFAULT 0 NOT NULL,
	"avg_communication" real DEFAULT 0 NOT NULL,
	"avg_cleanliness" real DEFAULT 0 NOT NULL,
	"avg_overall" real DEFAULT 0 NOT NULL,
	"avg_rapidity_meticulousness" real DEFAULT 0 NOT NULL,
	"avg_flexibility_rigor" real DEFAULT 0 NOT NULL,
	"avg_communicative_discreet" real DEFAULT 0 NOT NULL,
	"avg_innovative_traditional" real DEFAULT 0 NOT NULL,
	"total_clients" integer DEFAULT 0 NOT NULL,
	"satisfied_clients" integer DEFAULT 0 NOT NULL,
	"recommendation_rate" real DEFAULT 0 NOT NULL,
	"avg_response_time_hours" real,
	"professional_since" timestamp,
	"member_since" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "rating_statistics_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "rating_validations" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_id" text NOT NULL,
	"status" text NOT NULL,
	"fraud_flags" jsonb,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"reported_by" text,
	"report_reason" text,
	"reported_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"client_id" text NOT NULL,
	"quality_score" integer NOT NULL,
	"punctuality_score" integer NOT NULL,
	"honesty_score" integer NOT NULL,
	"communication_score" integer NOT NULL,
	"cleanliness_score" integer NOT NULL,
	"overall_score" real NOT NULL,
	"comment" text,
	"is_validated" boolean DEFAULT true NOT NULL,
	"is_suspicious" boolean DEFAULT false NOT NULL,
	"validated_at" timestamp,
	"contact_phone" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialized_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_id" text NOT NULL,
	"profession" text NOT NULL,
	"criteria_scores" jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recovery_word" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "connection_words" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cin_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cin_photo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_professional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activity_category" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "service_description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gps_coordinates" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "opening_hours" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contact_numbers" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "portfolio_photos" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "portfolio_videos" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "certificates" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auto_status" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "personality_traits" ADD CONSTRAINT "personality_traits_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_statistics" ADD CONSTRAINT "rating_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_validations" ADD CONSTRAINT "rating_validations_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_validations" ADD CONSTRAINT "rating_validations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_validations" ADD CONSTRAINT "rating_validations_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialized_criteria" ADD CONSTRAINT "specialized_criteria_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");