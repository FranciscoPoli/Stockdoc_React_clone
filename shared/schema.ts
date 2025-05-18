import { pgTable, text, serial, integer, boolean, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  exchange: text("exchange").notNull(),
  price: numeric("price").notNull(),
  change: numeric("change").notNull(),
  changePercent: numeric("change_percent").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const financialData = pgTable("financial_data", {
  id: serial("id").primaryKey(),
  stockId: integer("stock_id").notNull().references(() => stocks.id),
  dataType: text("data_type").notNull(), // revenue, netIncome, cash, etc.
  frequency: text("frequency").notNull(), // annual, quarterly
  year: text("year").notNull(), // 2019, 2020, etc. or Q1 2022, Q2 2022, etc.
  value: numeric("value").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
});

export const insertFinancialDataSchema = createInsertSchema(financialData).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stocks.$inferSelect;

export type InsertFinancialData = z.infer<typeof insertFinancialDataSchema>;
export type FinancialData = typeof financialData.$inferSelect;
