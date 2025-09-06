import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("member"),
  profileImage: text("profile_image"),
  points: integer("points").notNull().default(0),
  badges: jsonb("badges").notNull().default([]),
  streak: integer("streak").notNull().default(0),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  hostId: varchar("host_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  roomId: text("room_id").notNull().unique(),
  status: text("status").notNull().default("scheduled"), // scheduled, active, ended
  transcript: text("transcript"),
  summary: text("summary"),
  sentimentScore: integer("sentiment_score"),
  participants: jsonb("participants").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  teamId: varchar("team_id").references(() => teams.id),
  type: text("type").notNull().default("text"), // text, ai, system
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: varchar("assignee_id").references(() => users.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("todo"), // todo, in_progress, review, done
  dueDate: timestamp("due_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  aiPriority: integer("ai_priority"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  type: text("type").notNull(), // vacation, sick, personal, emergency
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approverId: varchar("approver_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const whiteboardSessions = pgTable("whiteboard_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id),
  title: text("title").notNull(),
  content: jsonb("content").notNull().default({}),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const moodRatings = pgTable("mood_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  rating: integer("rating").notNull(), // 1-5
  date: timestamp("date").defaultNow().notNull(),
  context: text("context"), // meeting, daily, etc.
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
});

export const insertMoodRatingSchema = createInsertSchema(moodRatings).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type MoodRating = typeof moodRatings.$inferSelect;
export type InsertMoodRating = z.infer<typeof insertMoodRatingSchema>;
