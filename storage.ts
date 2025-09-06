import { 
  type User, type InsertUser, 
  type Team, type InsertTeam,
  type Meeting, type InsertMeeting,
  type Message, type InsertMessage,
  type Task, type InsertTask,
  type LeaveRequest, type InsertLeaveRequest,
  type MoodRating, type InsertMoodRating
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: string, points: number): Promise<User>;
  updateUserStreak(userId: string, streak: number): Promise<User>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getUserTeams(userId: string): Promise<Team[]>;
  getTeamMembers(teamId: string): Promise<User[]>;
  addTeamMember(teamId: string, userId: string, role?: string): Promise<void>;

  // Meetings
  getMeeting(id: string): Promise<Meeting | undefined>;
  getMeetingByRoomId(roomId: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting>;
  getTeamMeetings(teamId: string): Promise<Meeting[]>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMeetingMessages(meetingId: string): Promise<Message[]>;
  getTeamMessages(teamId: string): Promise<Message[]>;

  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  getUserTasks(userId: string): Promise<Task[]>;
  getTeamTasks(teamId: string): Promise<Task[]>;

  // Leave Requests
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequestStatus(id: string, status: string, approverId?: string): Promise<LeaveRequest>;
  getTeamLeaveRequests(teamId: string): Promise<LeaveRequest[]>;

  // Mood Ratings
  createMoodRating(rating: InsertMoodRating): Promise<MoodRating>;
  getTeamMoodRatings(teamId: string, date?: Date): Promise<MoodRating[]>;
  getUserMoodRatings(userId: string): Promise<MoodRating[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private teamMembers: Map<string, string[]> = new Map(); // teamId -> userIds
  private meetings: Map<string, Meeting> = new Map();
  private messages: Map<string, Message> = new Map();
  private tasks: Map<string, Task> = new Map();
  private leaveRequests: Map<string, LeaveRequest> = new Map();
  private moodRatings: Map<string, MoodRating> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default user
    const defaultUser: User = {
      id: randomUUID(),
      username: "alex.johnson",
      email: "alex@synergysphere.com",
      password: "hashed_password",
      fullName: "Alex Johnson",
      role: "team_lead",
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      points: 2847,
      badges: ["Early Adopter", "Team Player", "Meeting Master"],
      streak: 7,
      timezone: "UTC",
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create default team
    const defaultTeam: Team = {
      id: randomUUID(),
      name: "Development Team",
      description: "Core development team for SynergySphere",
      ownerId: defaultUser.id,
      settings: {
        allowPublicJoin: false,
        defaultMeetingDuration: 60,
      },
      createdAt: new Date(),
    };
    this.teams.set(defaultTeam.id, defaultTeam);
    this.teamMembers.set(defaultTeam.id, [defaultUser.id]);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      role: insertUser.role || "member",
      profileImage: insertUser.profileImage || null,
      points: 0,
      badges: [],
      streak: 0,
      timezone: insertUser.timezone || "UTC",
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserPoints(userId: string, points: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, points: user.points + points };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStreak(userId: string, streak: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, streak };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Team methods
  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const team: Team = {
      ...insertTeam,
      id: randomUUID(),
      description: insertTeam.description || null,
      settings: insertTeam.settings || {},
      createdAt: new Date(),
    };
    this.teams.set(team.id, team);
    this.teamMembers.set(team.id, [team.ownerId]);
    return team;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const userTeams: Team[] = [];
    for (const [teamId, memberIds] of Array.from(this.teamMembers.entries())) {
      if (memberIds.includes(userId)) {
        const team = this.teams.get(teamId);
        if (team) userTeams.push(team);
      }
    }
    return userTeams;
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    const memberIds = this.teamMembers.get(teamId) || [];
    return memberIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async addTeamMember(teamId: string, userId: string, role = "member"): Promise<void> {
    const currentMembers = this.teamMembers.get(teamId) || [];
    if (!currentMembers.includes(userId)) {
      this.teamMembers.set(teamId, [...currentMembers, userId]);
    }
  }

  // Meeting methods
  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingByRoomId(roomId: string): Promise<Meeting | undefined> {
    return Array.from(this.meetings.values()).find(meeting => meeting.roomId === roomId);
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const meeting: Meeting = {
      ...insertMeeting,
      id: randomUUID(),
      description: insertMeeting.description || null,
      scheduledAt: insertMeeting.scheduledAt || null,
      startedAt: insertMeeting.startedAt || null,
      endedAt: insertMeeting.endedAt || null,
      transcript: insertMeeting.transcript || null,
      summary: insertMeeting.summary || null,
      sentimentScore: insertMeeting.sentimentScore || null,
      status: insertMeeting.status || "scheduled",
      participants: insertMeeting.participants || [],
      createdAt: new Date(),
    };
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
    const meeting = this.meetings.get(id);
    if (!meeting) throw new Error("Meeting not found");
    
    const updatedMeeting = { ...meeting, ...updates };
    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  async getTeamMeetings(teamId: string): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(meeting => meeting.teamId === teamId);
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: randomUUID(),
      type: insertMessage.type || "text",
      metadata: insertMessage.metadata || {},
      teamId: insertMessage.teamId || null,
      meetingId: insertMessage.meetingId || null,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async getMeetingMessages(meetingId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.meetingId === meetingId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getTeamMessages(teamId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.teamId === teamId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Task methods
  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const task: Task = {
      ...insertTask,
      id: randomUUID(),
      description: insertTask.description || null,
      assigneeId: insertTask.assigneeId || null,
      meetingId: insertTask.meetingId || null,
      priority: insertTask.priority || "medium",
      status: insertTask.status || "todo",
      dueDate: insertTask.dueDate || null,
      estimatedHours: insertTask.estimatedHours || null,
      actualHours: insertTask.actualHours || null,
      aiPriority: insertTask.aiPriority || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    
    const updatedTask = { ...task, ...updates, updatedAt: new Date() };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.assigneeId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getTeamTasks(teamId: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.teamId === teamId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Leave Request methods
  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    return this.leaveRequests.get(id);
  }

  async createLeaveRequest(insertRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const request: LeaveRequest = {
      ...insertRequest,
      id: randomUUID(),
      reason: insertRequest.reason || null,
      status: insertRequest.status || "pending",
      approverId: insertRequest.approverId || null,
      createdAt: new Date(),
    };
    this.leaveRequests.set(request.id, request);
    return request;
  }

  async updateLeaveRequestStatus(id: string, status: string, approverId?: string): Promise<LeaveRequest> {
    const request = this.leaveRequests.get(id);
    if (!request) throw new Error("Leave request not found");
    
    const updatedRequest = { ...request, status, approverId: approverId || null };
    this.leaveRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async getTeamLeaveRequests(teamId: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values())
      .filter(request => request.teamId === teamId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Mood Rating methods
  async createMoodRating(insertRating: InsertMoodRating): Promise<MoodRating> {
    const rating: MoodRating = {
      ...insertRating,
      id: randomUUID(),
      context: insertRating.context || null,
      date: insertRating.date || new Date(),
    };
    this.moodRatings.set(rating.id, rating);
    return rating;
  }

  async getTeamMoodRatings(teamId: string, date?: Date): Promise<MoodRating[]> {
    const ratings = Array.from(this.moodRatings.values())
      .filter(rating => rating.teamId === teamId);
    
    if (date) {
      const targetDate = date.toDateString();
      return ratings.filter(rating => rating.date.toDateString() === targetDate);
    }
    
    return ratings.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getUserMoodRatings(userId: string): Promise<MoodRating[]> {
    return Array.from(this.moodRatings.values())
      .filter(rating => rating.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}

export const storage = new MemStorage();
