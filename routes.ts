import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupWebRTCSignaling } from "./services/webrtc";
import { 
  summarizeMeeting, 
  analyzeSentiment, 
  translateText, 
  generateTaskPriority,
  generateMeetingInsights,
  chatWithAI 
} from "./services/openai";
import { 
  insertUserSchema, 
  insertTeamSchema, 
  insertMeetingSchema, 
  insertMessageSchema,
  insertTaskSchema,
  insertLeaveRequestSchema,
  insertMoodRatingSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebRTC signaling server
  const webrtcServer = setupWebRTCSignaling(httpServer);

  // Auth endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({ user: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User endpoints
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/users/:id/points", async (req, res) => {
    try {
      const { points } = req.body;
      const user = await storage.updateUserPoints(req.params.id, points);
      res.json({ ...user, password: undefined });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Team endpoints
  app.post("/api/teams", async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.id);
      res.json(members.map(user => ({ ...user, password: undefined })));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/teams", async (req, res) => {
    try {
      const teams = await storage.getUserTeams(req.params.id);
      res.json(teams);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Meeting endpoints
  app.post("/api/meetings", async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/meetings/:id", async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/meetings/room/:roomId", async (req, res) => {
    try {
      const meeting = await storage.getMeetingByRoomId(req.params.roomId);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/meetings/:id", async (req, res) => {
    try {
      const updates = req.body;
      const meeting = await storage.updateMeeting(req.params.id, updates);
      res.json(meeting);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/meetings", async (req, res) => {
    try {
      const meetings = await storage.getTeamMeetings(req.params.id);
      res.json(meetings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Message endpoints
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/meetings/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMeetingMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getTeamMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Task endpoints
  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      
      // Get AI priority and estimation
      const teamTasks = await storage.getTeamTasks(taskData.teamId);
      const existingTaskTitles = teamTasks.map(task => task.title);
      
      const aiAnalysis = await generateTaskPriority(taskData.title, existingTaskTitles);
      
      const enrichedTaskData = {
        ...taskData,
        priority: taskData.priority || aiAnalysis.priority,
        estimatedHours: taskData.estimatedHours || aiAnalysis.estimatedHours,
        aiPriority: Math.round((aiAnalysis.estimatedHours / 8) * 10) // AI priority score
      };

      const task = await storage.createTask(enrichedTaskData);
      res.json({ task, aiAnalysis });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const updates = req.body;
      const task = await storage.updateTask(req.params.id, updates);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getUserTasks(req.params.id);
      res.json(tasks);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTeamTasks(req.params.id);
      res.json(tasks);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Leave request endpoints
  app.post("/api/leave-requests", async (req, res) => {
    try {
      const requestData = insertLeaveRequestSchema.parse(req.body);
      const request = await storage.createLeaveRequest(requestData);
      res.json(request);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/leave-requests/:id/status", async (req, res) => {
    try {
      const { status, approverId } = req.body;
      const request = await storage.updateLeaveRequestStatus(req.params.id, status, approverId);
      res.json(request);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/leave-requests", async (req, res) => {
    try {
      const requests = await storage.getTeamLeaveRequests(req.params.id);
      res.json(requests);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mood rating endpoints
  app.post("/api/mood-ratings", async (req, res) => {
    try {
      const ratingData = insertMoodRatingSchema.parse(req.body);
      const rating = await storage.createMoodRating(ratingData);
      res.json(rating);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id/mood-ratings", async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const ratings = await storage.getTeamMoodRatings(req.params.id, date);
      
      // Calculate average mood
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
        : 0;

      res.json({ ratings, averageRating });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // AI endpoints
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const summary = await summarizeMeeting(text);
      res.json({ summary });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/sentiment", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const sentiment = await analyzeSentiment(text);
      res.json(sentiment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Text and target language are required" });
      }

      const translation = await translateText(text, targetLanguage);
      res.json({ translation });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/meeting-insights", async (req, res) => {
    try {
      const { transcript, participants } = req.body;
      if (!transcript || !participants) {
        return res.status(400).json({ error: "Transcript and participants are required" });
      }

      const insights = await generateMeetingInsights(transcript, participants);
      res.json(insights);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await chatWithAI(message, context);
      res.json({ response });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // WebRTC room info endpoint
  app.get("/api/webrtc/rooms/:roomId", (req, res) => {
    try {
      const roomInfo = webrtcServer.getRoomInfo(req.params.roomId);
      res.json(roomInfo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return httpServer;
}
