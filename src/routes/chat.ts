import { Router, Request, Response } from "express";
import {
  streamChatCompletion,
  getConversationHistory,
  streamChatWithAgent,
} from "../services/chatService";
import {
  streamAgentResponse,
  getAgentConversationHistory,
  searchOrionData,
} from "../services/agentService";

export const chatRouter = Router();

// Regular chat endpoint with streaming support and automatic agent detection
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, conversationId, mode } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Disable Express compression for this response
    res.set("Content-Encoding", "identity");

    let stream;

    // Handle explicit mode selection
    if (mode === "agent") {
      stream = await streamChatWithAgent(message, conversationId);
    } else if (mode === "regular") {
      stream = await streamChatCompletion(message, conversationId, false); // Force regular mode
    } else {
      // Use automatic detection (default behavior)
      stream = await streamChatCompletion(message, conversationId);
    }

    // Handle the ReadableStream properly
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Handle both string and Uint8Array chunks
        const chunk =
          typeof value === "string" ? value : new TextDecoder().decode(value);
        res.write(chunk);
      }
      res.end();
    } catch (error) {
      console.error("Stream error:", error);
      res.status(500).end();
    }
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Agent chat endpoint with vector search and streaming support
chatRouter.post("/agent", async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Disable Express compression for this response
    res.set("Content-Encoding", "identity");

    // Get streaming response from agent service with vector search
    const stream = await streamAgentResponse(message, conversationId);

    // Handle the ReadableStream properly
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Handle both string and Uint8Array chunks
        const chunk =
          typeof value === "string" ? value : new TextDecoder().decode(value);
        res.write(chunk);
      }
      res.end();
    } catch (error) {
      console.error("Agent stream error:", error);
      res.status(500).end();
    }
  } catch (error) {
    console.error("Agent endpoint error:", error);
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

// Get regular conversation history
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

// Get agent conversation history
chatRouter.get(
  "/agent/:conversationId",
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const history = await getAgentConversationHistory(conversationId);
      res.json({ conversationId, history, type: "agent" });
    } catch (error) {
      console.error("Get agent conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
