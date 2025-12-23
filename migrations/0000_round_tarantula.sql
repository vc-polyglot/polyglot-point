CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" text NOT NULL,
	"language" text NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"preferred_language" text DEFAULT 'es' NOT NULL,
	"subscription_type" text DEFAULT 'freemium' NOT NULL,
	"available_languages" text[] DEFAULT '{"es"}' NOT NULL,
	"active_language" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"subscription_type" text DEFAULT 'freemium' NOT NULL,
	"available_languages" text[] DEFAULT '{"es"}' NOT NULL,
	"active_language" text DEFAULT 'es' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
