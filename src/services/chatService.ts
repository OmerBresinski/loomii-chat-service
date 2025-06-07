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
      "Generate follow-up assistance suggestions to help the user continue the conversation or explore related topics. Format suggestions as if the user is writing them (first person), since they will be pasted into the chat when clicked.",
    schema: z.object({
      title: z.string().describe("Title for assistance suggestions"),
      suggestions: z
        .array(z.string())
        .max(3)
        .describe(
          "List of suggested follow-up questions or requests phrased from the user's perspective (e.g., 'Give me more quick wins', 'Show me competitive analysis', 'I need help with implementation') - max 3"
        ),
    }),
  }
);

// Create regular LLM for streaming
const createLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Create LLM with tools for card generation
const createLLMWithTools = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    streaming: false, // Tools work better without streaming
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([
    // generateActionListTool, // Disabled for now
    generateQuickWinsTool,
    generateCompetitiveAnalysisTool,
    generateAssistanceTool,
  ]);
};

// Helper function to determine if a message should trigger cards-only response
const shouldReplaceWithCards = (message: string): boolean => {
  console.log("🔍 Analyzing message for cards-only response:", message);

  // Keywords that suggest market intelligence queries
  const cardOnlyTriggers = [
    /give me \d+ (steps?|things?|ways?|actions?)/i,
    /\d+ (quick wins?|recommendations?|suggestions?)/i,
    /list of (actions?|steps?|recommendations?)/i,
    /what should (i|we) do/i,
    /how (can|should) (i|we) (improve|compete|respond)/i,
    /(action items?|to-?do list)/i,
  ];

  for (let i = 0; i < cardOnlyTriggers.length; i++) {
    const pattern = cardOnlyTriggers[i];
    const matches = pattern.test(message);
    console.log(
      `🔍 Pattern ${i + 1} (${pattern}): ${
        matches ? "✅ MATCH" : "❌ no match"
      }`
    );
    if (matches) {
      console.log("🎴 Message should trigger cards!");
      return true;
    }
  }

  console.log("📝 Message will use regular response");
  return false;
};

// Enhanced message analysis for agent mode detection
const shouldUseAgentMode = (message: string): boolean => {
  console.log("🤖 Analyzing message for agent mode:", message);

  const lowerMessage = message.toLowerCase();

  // High-priority triggers (strong indicators)
  const highPriorityTriggers = [
    "quick win",
    "competitive",
    "competitor",
    "market intelligence",
    "strategic",
    "action plan",
    "recommendations",
  ];

  // Company-specific terms - remove hardcoded companies
  const companyTerms: string[] = [];

  // Market intelligence terms
  const marketTerms = [
    "market",
    "industry",
    "trend",
    "analysis",
    "insight",
    "intelligence",
    "research",
    "data",
    "report",
  ];

  // Action-oriented terms
  const actionTerms = [
    "implement",
    "execute",
    "strategy",
    "plan",
    "approach",
    "solution",
    "optimize",
    "improve",
    "enhance",
  ];

  // Competitive terms
  const competitiveTerms = [
    "compete",
    "advantage",
    "positioning",
    "differentiate",
    "outperform",
    "benchmark",
    "compare",
  ];

  let score = 0;
  const reasons: string[] = [];

  // Check high-priority triggers (weight: 3)
  for (const trigger of highPriorityTriggers) {
    if (lowerMessage.includes(trigger)) {
      score += 3;
      reasons.push(`High-priority trigger: ${trigger}`);
    }
  }

  // Check company terms (weight: 2)
  for (const term of companyTerms) {
    if (lowerMessage.includes(term)) {
      score += 2;
      reasons.push(`Company term: ${term}`);
    }
  }

  // Check market terms (weight: 2)
  for (const term of marketTerms) {
    if (lowerMessage.includes(term)) {
      score += 2;
      reasons.push(`Market term: ${term}`);
    }
  }

  // Check action terms (weight: 2)
  for (const term of actionTerms) {
    if (lowerMessage.includes(term)) {
      score += 2;
      reasons.push(`Action term: ${term}`);
    }
  }

  // Check competitive terms (weight: 2)
  for (const term of competitiveTerms) {
    if (lowerMessage.includes(term)) {
      score += 2;
      reasons.push(`Competitive term: ${term}`);
    }
  }

  // Domain-specific terms (low weight)
  const domainTerms: string[] = [];
  for (const term of domainTerms) {
    if (lowerMessage.includes(term)) {
      score += 1;
      reasons.push(`Domain term: ${term}`);
    }
  }

  const threshold = 3;
  const shouldUseAgent = score >= threshold;

  console.log(`🎯 Agent mode analysis:`);
  console.log(`   Score: ${score}/${threshold}`);
  console.log(`   Decision: ${shouldUseAgent ? "USE AGENT" : "USE REGULAR"}`);
  console.log(`   Reasons: ${reasons.join(", ")}`);

  return shouldUseAgent;
};

// Helper function to check if message is asking for company-specific information
const isCompanyQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  const companies: string[] = []; // Remove hardcoded companies

  return companies.some((company) => lowerMessage.includes(company));
};

// Enhanced stream chat completion with automatic agent integration
export const streamChatCompletion = async (
  message: string,
  conversationId: string = "default",
  forceAgent?: boolean
): Promise<ReadableStream> => {
  const useAgent = forceAgent || shouldUseAgentMode(message);

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
    },
  });

  return stream;
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

  // Stream the metadata string in chunks immediately without delays
  for (let i = 0; i < metadataString.length; i += chunkSize) {
    const chunk = metadataString.slice(i, i + chunkSize);
    controller.enqueue(chunk);
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

  // Process the stream immediately without artificial delays
  for await (const chunk of llmStream) {
    if (chunk.content) {
      const contentStr =
        typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);
      fullResponse += contentStr;
      // Stream immediately without delays
      controller.enqueue(contentStr);
    }
  }

  // Add AI response to conversation history
  const aiMessage = new AIMessage(fullResponse);
  history.push(aiMessage);
  updateConversationHistory(conversationId, history);

  // Generate cards using LLM with tools (optional supplementary cards)
  const generatedCards = await generateCardsWithLLM(message, fullResponse);

  // Send generated cards as metadata only if they add value using immediate streaming
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
  // Create a streaming LLM for intro generation with temperature 0
  const introLLM = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const introPrompt = `You are an expert business analyst and consultant. The user asked: "${message}"

Generate a brief, natural introductory response (1-2 sentences) that:
- Acknowledges their specific request
- Sets up the expectation that detailed information follows in interactive cards
- Is conversational and professional, not robotic
- Does NOT repeat information that will be in the cards themselves
- Be direct and practical

Examples of good intros:
- "I can help you with that! Here are some actionable recommendations:"
- "Great question! Let me provide you with some strategic insights:"
- "Absolutely! I've identified several opportunities for you:"

Generate only the intro text, nothing else.`;

  // Stream the intro text in real-time as the LLM generates it
  console.log("🔧 Streaming intro text generation with LLM...");
  const introStream = await introLLM.stream([new HumanMessage(introPrompt)]);

  let introText = "";
  for await (const chunk of introStream) {
    if (chunk.content) {
      const contentStr =
        typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);
      introText += contentStr;
      // Stream each chunk immediately as it's generated
      controller.enqueue(contentStr);
    }
  }

  // Generate cards using LLM with tools
  const generatedResponse = await generateDynamicResponseWithCards(message, "");

  if (
    generatedResponse &&
    generatedResponse.cards &&
    generatedResponse.cards.length > 0
  ) {
    // Send the cards as the main content using immediate streaming
    const metadata = {
      timestamp: new Date().toISOString(),
      cards: generatedResponse.cards,
      replaceText: false, // Cards supplement the intro
    };

    // Add the intro + cards indication to history
    const aiMessage = new AIMessage(
      introText + " [Interactive cards provided]"
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

1. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
2. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
3. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

For assistance suggestions, phrase them from the USER'S perspective since they will be pasted into the chat when clicked. Examples:
- "Give me more quick wins for this topic"
- "Show me competitive analysis"
- "I need help with implementation"
- "What should I prioritize next?"
- "Help me understand the market better"

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
            // case "generate_action_list": // Disabled
            //   result = await generateActionListTool.invoke(
            //     toolCall.args as any
            //   );
            //   break;
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

// New function to generate dynamic response with cards using LLM
const generateDynamicResponseWithCards = async (
  userMessage: string,
  searchResults: string
): Promise<{ introText: string; cards: any[] } | null> => {
  try {
    console.log("🔍 Generating dynamic response with cards for:", userMessage);

    const systemPrompt = `You are an expert business analyst and consultant. Based on the user's request, provide:

1. A brief, contextual introduction (2-3 sentences max) that directly addresses their request
2. Generate relevant interactive cards using the available tools

Guidelines:
- Keep the intro concise and actionable
- Focus on providing immediate value
- Use tools to generate cards that help the user take action
- Do not include sources or references in your response
- Be direct and practical

Available context: ${searchResults}`;

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
1. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
2. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
3. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

For assistance suggestions, phrase them from the USER'S perspective since they will be pasted into the chat when clicked. Examples:
- "Give me more quick wins for this area"
- "Show me competitive analysis"
- "I need help with implementation"

Generate a brief, natural intro and then use the appropriate tools to create detailed cards.`;

    console.log("🔧 Invoking LLM for dynamic response generation...");
    const response = await llmWithTools.invoke([
      new HumanMessage(systemPrompt),
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
            // case "generate_action_list": // Disabled
            //   result = await generateActionListTool.invoke(
            //     toolCall.args as any
            //   );
            //   break;
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
