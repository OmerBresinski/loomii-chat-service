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
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Global conversation histories storage
// const conversationHistories = new Map<string, BaseMessage[]>();

// Define tools for the LLM to generate cards
const generateActionListTool = tool(
  async ({ title, items, description }) => {
    console.log("🔧 TOOL CALLED: generate_action_list", {
      title,
      itemsCount: items?.length,
      description,
    });
    return {
      type: "action-list",
      title,
      description,
      items,
    };
  },
  {
    name: "generate_action_list",
    description:
      "Generate an action list card when the user asks for recommendations, steps, or things to do",
    schema: z.object({
      title: z.string().describe("Title for the action list"),
      description: z.string().optional().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
          })
        )
        .describe("List of actionable items"),
    }),
  }
);

const generateQuickWinsTool = tool(
  async ({ title, items, description }) => {
    console.log("🔧 TOOL CALLED: generate_quick_wins", {
      title,
      itemsCount: items?.length,
      description,
    });
    return {
      type: "quick-wins",
      title,
      description,
      items,
    };
  },
  {
    name: "generate_quick_wins",
    description:
      "Generate quick wins card when user asks for immediate actions, things to do today/this week, or low-effort high-impact opportunities",
    schema: z.object({
      title: z.string().describe("Title for quick wins"),
      description: z.string().optional().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            value: z.number().optional().describe("Value score 1-10"),
            effort: z.number().optional().describe("Effort score 1-10"),
            ratio: z.number().optional().describe("Value to effort ratio"),
          })
        )
        .describe("List of quick win items"),
    }),
  }
);

const generateCompetitiveAnalysisTool = tool(
  async ({ title, items, description }) => {
    console.log("🔧 TOOL CALLED: generate_competitive_analysis", {
      title,
      itemsCount: items?.length,
      description,
    });
    return {
      type: "competitive-analysis",
      title,
      description,
      items,
    };
  },
  {
    name: "generate_competitive_analysis",
    description:
      "Generate competitive analysis card when user asks about competitors, competitive moves, market positioning, or how to respond to competitor actions",
    schema: z.object({
      title: z.string().describe("Title for competitive analysis"),
      description: z.string().optional().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            competitor: z.string().optional().describe("Competitor name"),
            advantage: z
              .string()
              .optional()
              .describe("Competitive advantage or insight"),
          })
        )
        .describe("List of competitive insights"),
    }),
  }
);

const generateAssistanceTool = tool(
  async ({ title, suggestions }) => {
    console.log("🔧 TOOL CALLED: generate_assistance_suggestions", {
      title,
      suggestionsCount: suggestions?.length,
    });
    return {
      type: "assistance-suggestions",
      title,
      suggestions,
    };
  },
  {
    name: "generate_assistance_suggestions",
    description:
      "Generate follow-up assistance suggestions to help the user continue the conversation or explore related topics",
    schema: z.object({
      title: z.string().describe("Title for assistance suggestions"),
      suggestions: z
        .array(z.string())
        .max(3)
        .describe("List of suggested follow-up questions or actions (max 3)"),
    }),
  }
);

// Create regular LLM for streaming
const createLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Create LLM with tools for card generation
const createLLMWithTools = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    streaming: false, // Tools work better without streaming
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([
    generateActionListTool,
    generateQuickWinsTool,
    generateCompetitiveAnalysisTool,
    generateAssistanceTool,
  ]);
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
    return streamRegularChat(message, conversationId);
  }
};

// Regular chat functionality with intelligent card generation
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
          // First, check if this should be a brief intro + cards response
          const shouldUseCardsOnly = await shouldReplaceWithCards(message);

          if (shouldUseCardsOnly) {
            console.log("🎴 Generating brief intro + cards response...");

            // Use brief intro + cards approach
            await streamBriefIntroWithCards(
              controller,
              message,
              history,
              conversationId
            );
          } else {
            // Regular text response with optional cards
            await streamRegularTextResponse(
              controller,
              message,
              history,
              conversationId
            );
          }

          console.log("🏁 Regular chat stream ending");
          controller.close();
        } catch (error) {
          console.error("Error in regular chat streaming:", error);
          controller.error(error);
        }
      });
    },
  });

  return stream;
};

// Helper function to determine if response should be cards-only
const shouldReplaceWithCards = async (message: string): Promise<boolean> => {
  const cardOnlyTriggers = [
    /give me \d+ (steps?|things?|ways?|actions?)/i,
    /\d+ (quick wins?|recommendations?|suggestions?)/i,
    /list of (actions?|steps?|recommendations?)/i,
    /what should (i|we) do/i,
    /how (can|should) (i|we) (improve|compete|respond)/i,
    /(action items?|to-?do list)/i,
  ];

  return cardOnlyTriggers.some((pattern) => pattern.test(message));
};

// Helper function to stream metadata in chunks
const streamMetadataInChunks = async (
  controller: ReadableStreamDefaultController,
  metadata: any,
  chunkSize: number = 100
) => {
  const metadataString = `\n\n__METADATA__${JSON.stringify(
    metadata
  )}__END_METADATA__`;

  // Stream the metadata string in chunks
  for (let i = 0; i < metadataString.length; i += chunkSize) {
    const chunk = metadataString.slice(i, i + chunkSize);
    controller.enqueue(chunk);

    // Small delay between chunks for natural streaming feel
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

// Helper function for regular text streaming
const streamRegularTextResponse = async (
  controller: ReadableStreamDefaultController,
  message: string,
  history: any[],
  conversationId: string
) => {
  let fullResponse = "";

  // Initialize regular LLM for streaming
  const llm = createLLM();

  // Get streaming response from LLM
  const llmStream = await llm.stream([...history]);

  // Process the stream
  for await (const chunk of llmStream) {
    if (chunk.content) {
      const contentStr =
        typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);
      fullResponse += contentStr;
      controller.enqueue(contentStr);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  // Add AI response to conversation history
  const aiMessage = new AIMessage(fullResponse);
  history.push(aiMessage);
  updateConversationHistory(conversationId, history);

  // Generate cards using LLM with tools (optional supplementary cards)
  const generatedCards = await generateCardsWithLLM(message, fullResponse);

  // Send generated cards as metadata only if they add value using chunked streaming
  if (generatedCards.length > 0) {
    const metadata = {
      timestamp: new Date().toISOString(),
      cards: generatedCards,
      replaceText: false, // Flag to indicate cards supplement text
    };
    await streamMetadataInChunks(controller, metadata);
  }
};

// Helper function for brief intro + cards response
const streamBriefIntroWithCards = async (
  controller: ReadableStreamDefaultController,
  message: string,
  history: any[],
  conversationId: string
) => {
  // Let the LLM generate both intro text and cards dynamically
  const generatedResponse = await generateDynamicResponseWithCards(message, "");

  if (generatedResponse && generatedResponse.introText) {
    // Stream the LLM-generated intro text in chunks
    const introText = generatedResponse.introText;
    const introChunkSize = 20;

    for (let i = 0; i < introText.length; i += introChunkSize) {
      const chunk = introText.slice(i, i + introChunkSize);
      controller.enqueue(chunk);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Small delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (generatedResponse.cards && generatedResponse.cards.length > 0) {
      // Send the cards as the main content using chunked streaming
      const metadata = {
        timestamp: new Date().toISOString(),
        cards: generatedResponse.cards,
        replaceText: false, // Cards supplement the intro
      };

      // Add the intro + cards indication to history
      const aiMessage = new AIMessage(
        generatedResponse.introText + " [Interactive cards provided]"
      );
      history.push(aiMessage);
      updateConversationHistory(conversationId, history);

      await streamMetadataInChunks(controller, metadata);
    } else {
      // Fallback to regular response if no cards generated
      await streamRegularTextResponse(
        controller,
        message,
        history,
        conversationId
      );
    }
  } else {
    // Fallback to regular response if no intro generated
    await streamRegularTextResponse(
      controller,
      message,
      history,
      conversationId
    );
  }
};

// Generate cards using LLM with tools
const generateCardsWithLLM = async (
  userMessage: string,
  aiResponse: string
): Promise<any[]> => {
  try {
    console.log("🎴 Starting card generation process...");
    console.log("📝 User message:", userMessage.substring(0, 100) + "...");
    console.log("🤖 AI response length:", aiResponse.length);

    const llmWithTools = createLLMWithTools();

    const cardGenerationPrompt = `Based on this conversation:

User: ${userMessage}
Assistant: ${aiResponse}

Analyze if the user's request and the assistant's response would benefit from interactive cards. Use the available tools to generate appropriate cards when:

1. User asks for recommendations, steps, or actionable advice → use generate_action_list
2. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
3. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
4. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

Only generate cards that add value to the conversation. If the response is just informational without actionable elements, you may skip action cards but still provide assistance suggestions.`;

    console.log("🔧 Invoking LLM with tools for card generation...");
    const response = await llmWithTools.invoke([
      new HumanMessage(cardGenerationPrompt),
    ]);

    console.log(
      "📊 LLM response received. Tool calls:",
      response.tool_calls?.length || 0
    );

    const cards: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log("🛠️ Processing tool calls...");
      for (const toolCall of response.tool_calls) {
        console.log(`🔧 Processing tool: ${toolCall.name}`);
        try {
          let result;
          switch (toolCall.name) {
            case "generate_action_list":
              result = await generateActionListTool.invoke(
                toolCall.args as any
              );
              break;
            case "generate_quick_wins":
              result = await generateQuickWinsTool.invoke(toolCall.args as any);
              break;
            case "generate_competitive_analysis":
              result = await generateCompetitiveAnalysisTool.invoke(
                toolCall.args as any
              );
              break;
            case "generate_assistance_suggestions":
              result = await generateAssistanceTool.invoke(
                toolCall.args as any
              );
              break;
          }
          if (result) {
            console.log(`✅ Tool ${toolCall.name} executed successfully`);
            cards.push(result);
          }
        } catch (error) {
          console.error(`❌ Error executing tool ${toolCall.name}:`, error);
        }
      }
    } else {
      console.log("ℹ️ No tool calls generated by LLM");
    }

    console.log(`🎴 Card generation complete. Generated ${cards.length} cards`);
    return cards;
  } catch (error) {
    console.error("❌ Error generating cards:", error);
    return [];
  }
};

// Stream chat with explicit agent mode
export const streamChatWithAgent = async (
  message: string,
  conversationId: string = "default"
): Promise<ReadableStream> => {
  return streamAgentResponse(message, conversationId);
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

// New function to generate dynamic response with cards using LLM
const generateDynamicResponseWithCards = async (
  userMessage: string,
  aiResponse: string
): Promise<{ introText: string; cards: any[] } | null> => {
  try {
    console.log("🎴 Starting dynamic response generation...");
    console.log("📝 User message:", userMessage.substring(0, 100) + "...");

    const llmWithTools = createLLMWithTools();

    const dynamicPrompt = `The user asked: "${userMessage}"

Your task is to:
1. Generate an appropriate brief introductory response (1-2 sentences) that acknowledges their request
2. Use the available tools to create interactive cards that provide the detailed answer

Guidelines for the intro:
- Be natural and conversational, not robotic
- Acknowledge what they're asking for specifically
- Set up the expectation that detailed information follows in the cards
- Don't repeat information that will be in the cards
- Examples of good intros:
  * "I can help you with that! Here are some actionable recommendations:"
  * "Great question! Let me provide you with some strategic insights:"
  * "Absolutely! I've identified several opportunities for you:"

Use the tools to generate cards when:
1. User asks for recommendations, steps, or actionable advice → use generate_action_list
2. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
3. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
4. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

Generate a brief, natural intro and then use the appropriate tools to create detailed cards.`;

    console.log("🔧 Invoking LLM for dynamic response generation...");
    const response = await llmWithTools.invoke([
      new HumanMessage(dynamicPrompt),
    ]);

    // Extract intro text from the response
    const introText = response.content?.toString() || "";

    console.log(
      "📊 Dynamic response received. Tool calls:",
      response.tool_calls?.length || 0
    );
    console.log(
      "📝 Generated intro text:",
      introText.substring(0, 100) + "..."
    );

    const cards: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log("🛠️ Processing tool calls...");
      for (const toolCall of response.tool_calls) {
        console.log(`🔧 Processing tool: ${toolCall.name}`);
        try {
          let result;
          switch (toolCall.name) {
            case "generate_action_list":
              result = await generateActionListTool.invoke(
                toolCall.args as any
              );
              break;
            case "generate_quick_wins":
              result = await generateQuickWinsTool.invoke(toolCall.args as any);
              break;
            case "generate_competitive_analysis":
              result = await generateCompetitiveAnalysisTool.invoke(
                toolCall.args as any
              );
              break;
            case "generate_assistance_suggestions":
              result = await generateAssistanceTool.invoke(
                toolCall.args as any
              );
              break;
          }
          if (result) {
            console.log(`✅ Tool ${toolCall.name} executed successfully`);
            cards.push(result);
          }
        } catch (error) {
          console.error(`❌ Error executing tool ${toolCall.name}:`, error);
        }
      }
    }

    console.log(
      `🎴 Dynamic response complete. Generated ${cards.length} cards`
    );

    return {
      introText: introText.trim(),
      cards,
    };
  } catch (error) {
    console.error("❌ Error generating dynamic response:", error);
    return null;
  }
};
