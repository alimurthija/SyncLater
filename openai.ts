import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function summarizeMeeting(transcript: string): Promise<string> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("No transcript provided for summarization");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert meeting summarizer. Create a concise but comprehensive summary of the meeting transcript, including key discussion points, decisions made, and action items. Format the response as JSON with sections for 'summary', 'keyPoints', 'decisions', and 'actionItems'."
        },
        {
          role: "user",
          content: `Please summarize this meeting transcript:\n\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.summary || "Unable to generate summary";
  } catch (error) {
    console.error("Error summarizing meeting:", error);
    throw new Error("Failed to generate meeting summary");
  }
}

export async function analyzeSentiment(text: string): Promise<{
  rating: number;
  confidence: number;
  mood: string;
}> {
  if (!text || text.trim().length === 0) {
    return { rating: 3, confidence: 0, mood: "neutral" };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a rating from 1 to 5 stars, a confidence score between 0 and 1, and a mood descriptor. Respond with JSON in this format: { 'rating': number, 'confidence': number, 'mood': string }"
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      rating: Math.max(1, Math.min(5, Math.round(result.rating || 3))),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      mood: result.mood || "neutral"
    };
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { rating: 3, confidence: 0, mood: "neutral" };
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error("No text provided for translation");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the provided text to ${targetLanguage}. Maintain the original tone and context. Only respond with the translated text.`
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 2000,
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error("Error translating text:", error);
    throw new Error("Failed to translate text");
  }
}

export async function generateTaskPriority(taskDescription: string, existingTasks: string[]): Promise<{
  priority: string;
  reasoning: string;
  estimatedHours: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a project management AI. Analyze the task description and context to determine priority level (low, medium, high, urgent), provide reasoning, and estimate completion time. Consider existing workload. Respond with JSON: { 'priority': string, 'reasoning': string, 'estimatedHours': number }"
        },
        {
          role: "user",
          content: `New task: ${taskDescription}\n\nExisting tasks: ${existingTasks.join(", ")}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      priority: result.priority || "medium",
      reasoning: result.reasoning || "Standard priority assignment",
      estimatedHours: Math.max(1, Math.min(40, result.estimatedHours || 4))
    };
  } catch (error) {
    console.error("Error generating task priority:", error);
    return {
      priority: "medium",
      reasoning: "Default priority due to analysis error",
      estimatedHours: 4
    };
  }
}

export async function generateMeetingInsights(transcript: string, participants: string[]): Promise<{
  speakingTimeDistribution: Record<string, number>;
  keyTopics: string[];
  actionItems: string[];
  nextSteps: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Analyze the meeting transcript to extract insights about speaking time distribution, key topics discussed, action items, and suggested next steps. Respond with JSON: { 'speakingTimeDistribution': {}, 'keyTopics': [], 'actionItems': [], 'nextSteps': [] }"
        },
        {
          role: "user",
          content: `Meeting transcript:\n${transcript}\n\nParticipants: ${participants.join(", ")}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      speakingTimeDistribution: result.speakingTimeDistribution || {},
      keyTopics: result.keyTopics || [],
      actionItems: result.actionItems || [],
      nextSteps: result.nextSteps || []
    };
  } catch (error) {
    console.error("Error generating meeting insights:", error);
    return {
      speakingTimeDistribution: {},
      keyTopics: [],
      actionItems: [],
      nextSteps: []
    };
  }
}

export async function chatWithAI(message: string, context: string = ""): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant for a team collaboration platform called SynergySphere. Help users with meeting organization, task management, scheduling, and team productivity. Be concise and helpful."
        },
        {
          role: "user",
          content: context ? `Context: ${context}\n\nQuestion: ${message}` : message
        }
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process your request.";
  } catch (error) {
    console.error("Error chatting with AI:", error);
    throw new Error("AI assistant is currently unavailable");
  }
}
