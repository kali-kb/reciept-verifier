ALTER TABLE "payment_transactions" ALTER COLUMN "transaction_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "transaction_id_idx" ON "payment_transactions" USING btree ("transaction_id");