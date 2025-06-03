import { Readable } from "stream";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { InMemoryStore } from "@langchain/core/stores";
import { streamAgentResponse } from "./agentService";
import dotenv from "dotenv";
import {
  getOrCreateConversationHistory,
  updateConversationHistory,
} from "./conversationHistory";

// Load environment variables
dotenv.config();

// Global conversation histories storage
// const conversationHistories = new Map<string, BaseMessage[]>();

// Initialize OpenAI ChatGPT 4o mini
const createLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4.1-mini",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Detect if a query would benefit from agent/vector search
const shouldUseAgent = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();

  // Keywords that suggest cybersecurity market intelligence queries
  const agentKeywords = [
    // Company names
    "zscaler",
    "digital guardian",
    "forcepoint",
    // Market intelligence terms
    "competitor",
    "competitive",
    "market",
    "industry",
    // Action-oriented terms
    "quick win",
    "high value",
    "roi",
    "return on investment",
    "strategy",
    "strategic",
    "action",
    "recommend",
    // Cybersecurity terms
    "security",
    "compliance",
    "dlp",
    "zero trust",
    "sse",
    "threat",
    "vulnerability",
    "ai security",
    "genai",
    // Business terms
    "value",
    "effort",
    "impact",
    "advantage",
    "opportunity",
  ];

  // Check if message contains any agent-relevant keywords
  return agentKeywords.some((keyword) => lowerMessage.includes(keyword));
};

// Enhanced stream chat completion with automatic agent integration
export const streamChatCompletion = async (
  message: string,
  conversationId: string = "default",
  forceAgent?: boolean
): Promise<ReadableStream> => {
  const useAgent = forceAgent || shouldUseAgent(message);

  if (useAgent) {
    return streamChatWithAgent(message, conversationId);
  } else {
    return streamRegularChatOnly(message, conversationId);
  }
};

// Regular chat functionality (original implementation)
const streamRegularChat = async (
  message: string,
  conversationId: string = "default"
): Promise<ReadableStream> => {
  const history = getOrCreateConversationHistory(conversationId);

  // Add user message to history
  const userMessage = new HumanMessage(message);
  history.push(userMessage);

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      // Start streaming immediately in background
      setImmediate(async () => {
        try {
          let fullResponse = "";

          // Initialize LLM
          const llm = createLLM();

          // Get streaming response from LLM
          const llmStream = await llm.stream([...history]);

          // Process the stream
          for await (const chunk of llmStream) {
            const content = chunk.content;
            if (content) {
              const contentStr =
                typeof content === "string" ? content : JSON.stringify(content);
              fullResponse += contentStr;

              console.log(
                `Streaming chunk: ${
                  contentStr.length
                } chars, content: ${contentStr.substring(0, 50)}...`
              );

              // Enqueue the chunk
              controller.enqueue(new TextEncoder().encode(contentStr));

              // Small delay to ensure chunks are sent individually
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }

          // Add AI response to conversation history
          const aiMessage = new AIMessage(fullResponse);
          history.push(aiMessage);
          updateConversationHistory(conversationId, history);

          // Close the stream
          controller.close();
        } catch (error) {
          console.error("Error in streaming:", error);
          controller.error(error);
        }
      });
    },
  });

  return stream;
};

// Stream chat with explicit agent mode
export const streamChatWithAgent = async (
  message: string,
  conversationId: string = "default"
): Promise<ReadableStream> => {
  return streamAgentResponse(message, conversationId);
};

// Stream regular chat without agent
export const streamRegularChatOnly = async (
  message: string,
  conversationId: string = "default"
): Promise<ReadableStream> => {
  const history = getOrCreateConversationHistory(conversationId);

  // ... existing code ...

  return streamRegularChat(message, conversationId);
};

// Get conversation history
export const getConversationHistory = async (
  conversationId: string = "default"
) => {
  const history = getOrCreateConversationHistory(conversationId);
  return history;
};

// Clear conversation history
export const clearConversationHistory = async (
  conversationId: string = "default"
) => {
  const history = getOrCreateConversationHistory(conversationId);
  history.length = 0; // Clear the array
  return {
    success: true,
    message: `Conversation history cleared for ${conversationId}`,
  };
};

// Enhanced function to determine chat mode based on message content
export const analyzeChatMode = (
  message: string
): {
  mode: "agent" | "regular";
  confidence: number;
  reasons: string[];
} => {
  const lowerMessage = message.toLowerCase();
  const reasons: string[] = [];
  let agentScore = 0;

  // Company mentions (high weight)
  const companies = ["zscaler", "digital guardian", "forcepoint"];
  companies.forEach((company) => {
    if (lowerMessage.includes(company)) {
      agentScore += 3;
      reasons.push(`Mentions ${company}`);
    }
  });

  // Market intelligence terms (medium weight)
  const marketTerms = [
    "competitor",
    "competitive",
    "market",
    "industry",
    "strategy",
    "strategic",
  ];
  marketTerms.forEach((term) => {
    if (lowerMessage.includes(term)) {
      agentScore += 2;
      reasons.push(`Contains market intelligence term: ${term}`);
    }
  });

  // Action-oriented terms (medium weight)
  const actionTerms = [
    "quick win",
    "high value",
    "roi",
    "recommend",
    "action",
    "opportunity",
  ];
  actionTerms.forEach((term) => {
    if (lowerMessage.includes(term)) {
      agentScore += 2;
      reasons.push(`Contains action-oriented term: ${term}`);
    }
  });

  // Cybersecurity terms (low weight)
  const securityTerms = [
    "security",
    "compliance",
    "dlp",
    "zero trust",
    "threat",
    "vulnerability",
  ];
  securityTerms.forEach((term) => {
    if (lowerMessage.includes(term)) {
      agentScore += 1;
      reasons.push(`Contains cybersecurity term: ${term}`);
    }
  });

  const confidence = Math.min(agentScore / 5, 1); // Normalize to 0-1
  const mode = agentScore >= 2 ? "agent" : "regular";

  return { mode, confidence, reasons };
};

// Example function showing how LangGraph could be integrated for complex workflows
// This is a placeholder for future AI workflow implementation
export const createLangGraphWorkflow = () => {
  // LangGraph workflow example (not currently used but imported for future use)
  // const workflow = new StateGraph({...});
  // workflow.addNode("process", async (state) => {...});
  // workflow.addEdge(START, "process");
  // workflow.addEdge("process", END);
  // return workflow.compile();

  console.log(
    "LangGraph libraries imported and ready for complex AI workflows"
  );
  return null;
};
