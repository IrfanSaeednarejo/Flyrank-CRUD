CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"department" varchar(100) NOT NULL,
	"bio" text,
	"project" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
