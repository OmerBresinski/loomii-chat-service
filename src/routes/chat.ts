import { Router, Request, Response } from "express";
import {
  streamChatCompletion,
  getConversationHistory,
} from "../services/chatService";
import { searchOrionData } from "../services/vectorStore";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const chatRouter = Router();

// Create LLM for assistance suggestions
const createAssistanceLLM = () => {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    streaming: false,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Assistant suggestions endpoint
chatRouter.post(
  "/assistant-suggestions",
  async (req: Request, res: Response) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log("🎯 Generating assistant suggestions for:", message);

      const llm = createAssistanceLLM();

      const prompt = `You are an expert business analyst and consultant assistant. Based on the message, generate helpful follow-up assistance suggestions.

**IMPORTANT CONTEXT UNDERSTANDING:**
- You have access to comprehensive business intelligence and market data
- This is your complete context - you do not need additional information to provide recommendations
- Generate suggestions that help the user continue the conversation or explore related topics
- Do NOT ask for more context, clarification, or additional details

The user said: "${message}"

Your task is to generate 2-3 relevant follow-up suggestions that would be helpful for them to explore next.

Guidelines for suggestions:
- Phrase them from the USER'S perspective (first person) since they will be pasted into the chat when clicked
- Make them specific and actionable
- Focus on natural next steps or related topics
- Keep them concise but clear
- Examples of good suggestions:
  * "How can I prepare for the conference?"
  * "Give me more quick wins"
  * "Show me competitive analysis for this market"
  * "I need help with implementation planning"
  * "What should I prioritize next?"
  * "Help me create a timeline for these actions"
  * "Show me the risks and mitigation strategies"

Respond with a JSON object in this exact format:
{
  "title": "What would you like to explore next?",
  "suggestions": [
    "suggestion 1 from user perspective",
    "suggestion 2 from user perspective",
    "suggestion 3 from user perspective"
  ]
}

Only return the JSON object, nothing else.`;

      console.log("🔧 Invoking LLM for assistance suggestions generation...");
      const response = await llm.invoke([new HumanMessage(prompt)]);

      const responseContent = response.content?.toString() || "";
      console.log("📊 LLM response received:", responseContent);

      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(responseContent);

        if (
          parsedResponse.title &&
          parsedResponse.suggestions &&
          Array.isArray(parsedResponse.suggestions)
        ) {
          console.log("✅ Assistance suggestions generated successfully");

          res.json({
            success: true,
            message: "Assistance suggestions generated successfully",
            data: {
              type: "assistance-suggestions",
              title: parsedResponse.title,
              suggestions: parsedResponse.suggestions.slice(0, 3), // Ensure max 3 suggestions
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error("❌ Invalid response format from LLM");
          res.status(500).json({
            error: "Invalid response format from LLM",
            details: "Expected JSON with title and suggestions array",
          });
        }
      } catch (parseError) {
        console.error("❌ Error parsing LLM response:", parseError);
        res.status(500).json({
          error: "Error parsing LLM response",
          details:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        });
      }
    } catch (error) {
      console.error("Assistant suggestions endpoint error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Unified chat endpoint with streaming support and intelligent routing
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Set headers for proper streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Disable Express compression for this response
    res.set("Content-Encoding", "identity");

    // Use unified chat service that handles everything
    const stream = await streamChatCompletion(message, conversationId);

    // Handle the Node.js Readable stream properly
    stream.on("data", (chunk) => {
      res.write(chunk);
    });

    stream.on("end", () => {
      res.end();
    });

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Search orionData endpoint (non-streaming)
chatRouter.post("/search", async (req: Request, res: Response) => {
  try {
    const {
      query,
      searchType = "similarity",
      k = 3,
      includeScores = false,
      minValue = 6,
      maxEffort = 4,
      minRatio = 1.5,
    } = req.body;

    if (
      !query &&
      !["quickWins", "highValue", "valueEffort"].includes(searchType)
    ) {
      return res
        .status(400)
        .json({ error: "Query is required for this search type" });
    }

    const searchResults = await searchOrionData(query || "", {
      searchType,
      k,
      includeScores,
      minValue,
      maxEffort,
      minRatio,
    });

    res.json(searchResults);
  } catch (error) {
    console.error("Search endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get conversation history
chatRouter.get("/chat/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const history = await getConversationHistory(conversationId);
    res.json({ conversationId, history, type: "chat" });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
