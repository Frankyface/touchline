import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const notebooks = sqliteTable("notebooks", {
  userId: text("user_id").primaryKey(),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});
