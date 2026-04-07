import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// --- Users ---

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(), // ISO string
  updatedAt: text("updated_at").notNull(),
});

// --- API Keys ---

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  scopes: text("scopes").notNull().default("read"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
});

// --- Profiles ---

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  name: text("name").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  settings: text("settings", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Domains ---

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isBuiltIn: integer("is_built_in", { mode: "boolean" }).notNull().default(false),
}, (t) => [
  uniqueIndex("domains_profile_slug_idx").on(t.profileId, t.slug),
]);

// --- Categories ---

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
}, (t) => [
  uniqueIndex("categories_domain_slug_idx").on(t.domainId, t.slug),
]);

// --- Skills ---

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  domainId: text("domain_id").notNull().references(() => domains.id),
  categoryId: text("category_id").notNull().references(() => categories.id),
  proficiency: text("proficiency").notNull(),
  notes: text("notes"),
  sources: text("sources", { mode: "json" }).notNull().default("[]"),
  usage: text("usage", { mode: "json" }).notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  uniqueIndex("skills_profile_slug_domain_idx").on(t.profileId, t.slug, t.domainId),
]);

// --- Learning Goals ---

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domainId: text("domain_id").notNull().references(() => domains.id),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  progress: text("progress", { mode: "json" }).notNull().default("[]"),
  resources: text("resources", { mode: "json" }).notNull().default("[]"),
  targetDate: text("target_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Interests ---

export const interests = sqliteTable("interests", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domainId: text("domain_id").notNull().references(() => domains.id),
  description: text("description"),
  createdAt: text("created_at").notNull(),
});

// --- Relations (same as Postgres) ---

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  apiKeys: many(apiKeys),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  domains: many(domains),
  skills: many(skills),
  goals: many(goals),
  interests: many(interests),
}));

export const domainsRelations = relations(domains, ({ one, many }) => ({
  profile: one(profiles, { fields: [domains.profileId], references: [profiles.id] }),
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  domain: one(domains, { fields: [categories.domainId], references: [domains.id] }),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  profile: one(profiles, { fields: [skills.profileId], references: [profiles.id] }),
  domain: one(domains, { fields: [skills.domainId], references: [domains.id] }),
  category: one(categories, { fields: [skills.categoryId], references: [categories.id] }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  profile: one(profiles, { fields: [goals.profileId], references: [profiles.id] }),
  domain: one(domains, { fields: [goals.domainId], references: [domains.id] }),
}));

export const interestsRelations = relations(interests, ({ one }) => ({
  profile: one(profiles, { fields: [interests.profileId], references: [profiles.id] }),
  domain: one(domains, { fields: [interests.domainId], references: [domains.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));
