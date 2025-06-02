import { Router, Request, Response } from "express";
import {
  streamChatCompletion,
  getConversationHistory,
} from "../services/chatService";

export const chatRouter = Router();

// Chat endpoint with streaming support
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body;

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

    // Get streaming response from chat service
    const stream = await streamChatCompletion(message, conversationId);

    // Pipe the stream to the response
    stream.on("data", (chunk: string) => {
      res.write(chunk);
    });

    stream.on("end", () => {
      res.end();
    });

    stream.on("error", (error: Error) => {
      console.error("Stream error:", error);
      res.status(500).end();
    });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get conversation history
chatRouter.get("/chat/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const history = await getConversationHistory(conversationId);
    res.json({ conversationId, history });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
