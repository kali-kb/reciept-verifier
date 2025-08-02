CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" text,
	"amount" text,
	"provider" varchar,
	"date" text
);
