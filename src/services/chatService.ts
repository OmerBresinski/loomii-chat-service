import { Readable } from "stream";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { InMemoryStore } from "@langchain/core/stores";
import { streamAgentResponse } from "./agentService";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Global conversation histories storage
const conversationHistories = new Map<string, BaseMessage[]>();

// Initialize OpenAI ChatGPT 4o mini
const createLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4.1-mini",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Get or create conversation history
const getOrCreateHistory = (conversationId?: string): BaseMessage[] => {
  if (!conversationId) {
    return [];
  }

  if (!conversationHistories.has(conversationId)) {
    conversationHistories.set(conversationId, []);
  }

  return conversationHistories.get(conversationId)!;
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
  conversationId?: string,
  forceAgent: boolean = false
): Promise<Readable> => {
  // Determine if we should use agent capabilities
  const useAgent = true; //forceAgent || shouldUseAgent(message);

  if (useAgent) {
    console.log("🤖 Using agent with vector search for enhanced response");
    // Use agent service for cybersecurity market intelligence queries
    return streamAgentResponse(message, conversationId);
  }

  // Use regular chat for general queries
  console.log("💬 Using regular chat for general conversation");
  return streamRegularChat(message, conversationId);
};

// Regular chat functionality (original implementation)
const streamRegularChat = async (
  message: string,
  conversationId?: string
): Promise<Readable> => {
  const stream = new Readable({
    read() {},
    objectMode: false,
    highWaterMark: 0, // Disable internal buffering
  });

  // Start streaming immediately in the background
  setImmediate(async () => {
    try {
      const llm = createLLM();

      // Get or create conversation history
      const history = getOrCreateHistory(conversationId);

      // Add user message to history
      const userMessage = new HumanMessage(message);
      history.push(userMessage);

      // Stream response directly from LLM
      // TODO: Integrate with LangGraph for more complex AI workflows
      const streamResponse = await llm.stream(history);

      let fullResponse = "";

      // Process the streaming response
      for await (const chunk of streamResponse) {
        const content = chunk.content;
        if (content) {
          const contentStr =
            typeof content === "string" ? content : JSON.stringify(content);
          fullResponse += contentStr;
          console.log(
            `📤 Pushing chunk: "${contentStr.substring(0, 20)}..." (${
              contentStr.length
            } chars)`
          );
          stream.push(contentStr);

          // Small delay to ensure chunks are sent individually
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Add AI response to history
      const aiMessage = new AIMessage(fullResponse);
      history.push(aiMessage);

      // Update conversation history
      if (conversationId) {
        conversationHistories.set(conversationId, history);
      }

      console.log("🏁 Stream ending");
      // End the stream
      stream.push(null);
    } catch (error) {
      console.error("Error in streamRegularChat:", error);
      stream.emit("error", error);
    }
  });

  return stream;
};

// Stream chat with explicit agent mode
export const streamChatWithAgent = async (
  message: string,
  conversationId?: string
): Promise<Readable> => {
  console.log("🤖 Explicitly using agent mode with vector search");
  return streamAgentResponse(message, conversationId);
};

// Stream regular chat without agent
export const streamRegularChatOnly = async (
  message: string,
  conversationId?: string
): Promise<Readable> => {
  console.log("💬 Explicitly using regular chat mode");
  return streamRegularChat(message, conversationId);
};

// Get conversation history
export const getConversationHistory = async (
  conversationId: string
): Promise<BaseMessage[]> => {
  return conversationHistories.get(conversationId) || [];
};

// Clear conversation history
export const clearConversationHistory = async (
  conversationId: string
): Promise<void> => {
  conversationHistories.delete(conversationId);
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
