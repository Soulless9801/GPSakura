import { doublePrecision, integer, pgTable, serial, text } from 'drizzle-orm/pg-core'

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  player_id: integer('player_id').notNull(),
  bet_amount: doublePrecision('bet_amount').notNull(),
  player_cards: integer('player_cards').notNull(),
  dealer_cards: integer('dealer_cards').notNull(),
  deck_seed: integer('deck_seed').notNull(),
})

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  money: doublePrecision('money').notNull(),
})
