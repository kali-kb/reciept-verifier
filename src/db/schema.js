import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';



export const payment_transactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  transaction_id: text('transaction_id'),
  amount: text('amount'),
  provider: varchar('provider', { enum: ['cbe', 'telebirr'] }),
  date: text('date'),
});

