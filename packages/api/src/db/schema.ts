import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Users ---

export const users = pgTable("users", {
  id: text("id").primaryKey(), // UUID
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- API Keys ---

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(), // First 8 chars for identification
  scopes: text("scopes").notNull().default("read"), // comma-separated: read,write
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Profiles ---

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  preferredLanguage: text("preferred_language"),
  customInstructions: text("custom_instructions"),
  isPublic: boolean("is_public").notNull().default(false),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Domains ---

export const domains = pgTable("domains", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  visibility: text("visibility").notNull().default("public"),
  proficiencyLabels: jsonb("proficiency_labels").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("domains_profile_slug_idx").on(t.profileId, t.slug),
]);

// --- Categories ---

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("categories_domain_slug_idx").on(t.domainId, t.slug),
]);

// --- Skills ---

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  domainId: text("domain_id").notNull().references(() => domains.id),
  categoryId: text("category_id").notNull().references(() => categories.id),
  proficiency: text("proficiency").notNull(), // novice | familiar | proficient | advanced | expert
  proficiencyLabel: text("proficiency_label"),
  notes: text("notes"),
  sources: jsonb("sources").notNull().default([]),
  visibility: text("visibility").notNull().default("public"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("skills_profile_slug_domain_idx").on(t.profileId, t.slug, t.domainId),
]);

// --- Learning Goals ---

export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domainId: text("domain_id").notNull().references(() => domains.id),
  description: text("description"),
  motivation: text("motivation"),
  notes: text("notes"),
  priority: text("priority").notNull().default("medium"), // low | medium | high
  status: text("status").notNull().default("active"), // active | paused | completed | abandoned
  progress: jsonb("progress").notNull().default([]),
  resources: jsonb("resources").notNull().default([]),
  targetDate: timestamp("target_date", { withTimezone: true }),
  visibility: text("visibility").notNull().default("public"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Interests ---

export const interests = pgTable("interests", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domainId: text("domain_id").references(() => domains.id),
  description: text("description"),
  notes: text("notes"),
  visibility: text("visibility").notNull().default("public"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations ---

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
  projects: many(projects),
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

// --- Projects ---

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url"),
  role: text("role"),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("medium"),
  featured: boolean("featured").notNull().default(false),
  skillIds: jsonb("skill_ids").notNull().default([]),
  highlights: jsonb("highlights").notNull().default([]),
  notes: text("notes"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  visibility: text("visibility").notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  profile: one(profiles, { fields: [projects.profileId], references: [profiles.id] }),
}));
