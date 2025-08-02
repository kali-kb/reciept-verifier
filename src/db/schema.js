const { pgTable, serial, text, varchar, index, integer } = require('drizzle-orm/pg-core');

const payment_transactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  transaction_id: text('transaction_id').notNull(),
  amount: integer('amount'),
  provider: varchar('provider', { enum: ['cbe', 'telebirr'] }),
  date: text('date'),
}, (table) => {
  return {
    transaction_id_idx: index('transaction_id_idx').on(table.transaction_id),
  }
});


module.exports = { payment_transactions };

