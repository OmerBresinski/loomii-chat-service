import { Readable } from "stream";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { InMemoryStore } from "@langchain/core/stores";
import dotenv from "dotenv";
import {
  getOrCreateConversationHistory,
  updateConversationHistory,
} from "./conversationHistory";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  initializeVectorStore,
  performSimilaritySearch,
  getQuickWins,
  getHighValueActions,
  getActionsByValueEffortRatio,
  getInsightsByCompany,
  getInsightsByImpact,
} from "./vectorStore";
import { Document } from "@langchain/core/documents";

// Load environment variables
dotenv.config();

// Define tools for the LLM to generate cards
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
      "ONLY use this tool when the user is explicitly asking you to GENERATE or CREATE NEW quick wins, immediate actions, or low-effort high-impact opportunities. Do NOT use this tool when the user is discussing, analyzing, or asking for help with EXISTING quick wins (e.g., 'help me split this quick win into tasks', 'how do I implement this quick win'). Only use when they want you to suggest NEW quick wins.",
    schema: z.object({
      title: z.string().describe("Title for quick wins"),
      description: z.string().optional().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z
              .string()
              .describe("Title for quick win, between 6-8 words"),
            priority: z
              .string()
              .describe("Priority level, one of: low, medium, high"),
            reason: z
              .string()
              .describe("Why this is important, concise 2-3 sentences"),
            nextSteps: z
              .string()
              .describe("What to do next, concise 2-3 sentences"),
            impact: z
              .string()
              .describe("What impact will it have, concise 2-3 sentences"),
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
    modelName: "gpt-4o",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Create LLM with tools for card generation
const createLLMWithTools = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    streaming: false, // Tools work better without streaming
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([generateQuickWinsTool, generateAssistanceTool]);
};

// Enhanced query analysis to detect specific search intents
const analyzeQuery = (
  query: string
): {
  searchType:
    | "similarity"
    | "company"
    | "impact"
    | "quickWins"
    | "highValue"
    | "valueEffort"
    | "general";
  searchTerm?: string;
  k?: number;
} => {
  const lowerQuery = query.toLowerCase();

  // Check for quick wins queries
  if (
    lowerQuery.includes("quick win") ||
    lowerQuery.includes("low effort") ||
    lowerQuery.includes("easy") ||
    (lowerQuery.includes("today") &&
      (lowerQuery.includes("value") || lowerQuery.includes("return"))) ||
    lowerQuery.includes("immediate")
  ) {
    return { searchType: "quickWins", k: 5 };
  }

  // Check for high-value queries
  if (
    lowerQuery.includes("high value") ||
    lowerQuery.includes("highest value") ||
    lowerQuery.includes("most valuable") ||
    lowerQuery.includes("biggest impact")
  ) {
    return { searchType: "highValue", k: 5 };
  }

  // Check for value-effort ratio queries
  if (
    lowerQuery.includes("value effort") ||
    lowerQuery.includes("roi") ||
    lowerQuery.includes("return on investment") ||
    lowerQuery.includes("efficiency")
  ) {
    return { searchType: "valueEffort", k: 5 };
  }

  // Check for company-specific queries
  const companyMatch = lowerQuery.match(
    /\b(microsoft|google|amazon|apple|meta|tesla|nvidia|salesforce)\b/
  );
  if (companyMatch) {
    return { searchType: "company", searchTerm: companyMatch[1], k: 5 };
  }

  // Check for impact-level queries
  if (lowerQuery.includes("high impact")) {
    return { searchType: "impact", searchTerm: "high", k: 5 };
  }
  if (lowerQuery.includes("medium impact")) {
    return { searchType: "impact", searchTerm: "medium", k: 5 };
  }
  if (lowerQuery.includes("low impact")) {
    return { searchType: "impact", searchTerm: "low", k: 5 };
  }

  // Default to similarity search
  return { searchType: "similarity", k: 3 };
};

// Format search results for the LLM context
const formatSearchResults = (results: Document[]): string => {
  if (results.length === 0) {
    return "No relevant insights found in the market intelligence data.";
  }

  return results
    .map((doc, index) => {
      const metadata = doc.metadata;

      // Format differently based on document type
      if (metadata.documentType === "action") {
        // Format source links for actions
        const sourceLinks =
          metadata.links && Array.isArray(metadata.links)
            ? metadata.links
                .map(
                  (link: string, linkIndex: number) =>
                    `[Source ${linkIndex + 1}](${link})`
                )
                .join("\n")
            : "No source links available";

        return `
--- Action ${index + 1} ---
Company: ${metadata.company}
Action: ${metadata.actionContent}
Value Score: ${metadata.value}/10
Effort Score: ${metadata.effort}/10
Value-to-Effort Ratio: ${metadata.valueToEffortRatio}
Quick Win Category: ${metadata.quickWinCategory}
Context: ${metadata.insightTitle}
Impact Level: ${metadata.impact}
Source Links:
${sourceLinks}
`;
      } else {
        // Format source links for insights
        const sourceLinks =
          metadata.links && Array.isArray(metadata.links)
            ? metadata.links
                .map(
                  (link: string, linkIndex: number) =>
                    `[Source ${linkIndex + 1}](${link})`
                )
                .join("\n")
            : "No source links available";

        return `
--- Insight ${index + 1} ---
Company: ${metadata.company}
Title: ${metadata.title}
Impact: ${metadata.impact}
Content: ${doc.pageContent}
Source Links:
${sourceLinks}
`;
      }
    })
    .join("\n");
};

// Create system prompt based on search results and query type
const createSystemPrompt = (
  searchResults: string,
  searchType: string
): string => {
  const basePrompt = `You are an expert business analyst and market intelligence consultant with access to comprehensive business data and insights.

**IMPORTANT CONTEXT UNDERSTANDING:**
- You have access to comprehensive business intelligence and market data
- This is your complete context - you do not need additional information to provide recommendations
- When users ask broad questions, provide direct, actionable recommendations
- Do NOT ask for more context, clarification, or additional details - work with what you have
- Provide immediate value and practical advice

**Available Market Intelligence:**
${searchResults}

Your role is to:
1. Provide direct, actionable business advice and recommendations
2. Help users with strategic thinking and decision-making based on market intelligence
3. Offer practical solutions based on business best practices and the available data
4. Be conversational and helpful while remaining professional
5. **Always provide direct answers without requesting more information**

Guidelines:
- Be concise but thorough in your responses
- Provide specific, actionable advice when possible
- Use the market intelligence data to support your recommendations
- Be conversational and engaging
- Focus on practical implementation
- **CRITICAL: Do NOT ask for more context or clarification - provide direct recommendations based on the question asked**
- Use tools when appropriate to generate interactive cards for actionable content

Remember: You are here to provide immediate value and actionable insights based on market intelligence. Give direct, helpful responses.`;

  if (searchType === "quickWins") {
    return (
      basePrompt +
      `

**SPECIAL FOCUS: QUICK WINS**
You are analyzing QUICK WINS - actions that provide high value with relatively low effort. Focus on:
- Immediate implementation opportunities
- Low-effort, high-impact actions
- Things that can be done today or this week
- Competitive advantages that require minimal resources
- Strategic moves with quick returns`
    );
  }

  return basePrompt;
};

// Main unified chat completion function
export const streamChatCompletion = async (
  message: string,
  conversationId: string = "default",
  forceAgent?: boolean
): Promise<ReadableStream> => {
  const history = getOrCreateConversationHistory(conversationId);

  // Add user message to history
  const userMessage = new HumanMessage(message);
  history.push(userMessage);

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("🤖 Processing message:", message);

        // Analyze query to determine search strategy
        const queryAnalysis = analyzeQuery(message);
        console.log("🔍 Query analysis:", queryAnalysis);

        // Initialize vector store and get relevant data
        await initializeVectorStore();

        let searchResults: any[] = [];

        // Get relevant data based on query type
        switch (queryAnalysis.searchType) {
          case "quickWins":
            searchResults = await getQuickWins(queryAnalysis.k || 5);
            break;
          case "highValue":
            searchResults = await getHighValueActions(queryAnalysis.k || 5);
            break;
          case "valueEffort":
            searchResults = await getActionsByValueEffortRatio(
              queryAnalysis.k || 5
            );
            break;
          case "company":
            if (queryAnalysis.searchTerm) {
              searchResults = await getInsightsByCompany(
                queryAnalysis.searchTerm
              );
            }
            break;
          case "impact":
            if (queryAnalysis.searchTerm) {
              searchResults = await getInsightsByImpact(
                queryAnalysis.searchTerm as "high" | "medium" | "low"
              );
            }
            break;
          case "similarity":
          default:
            searchResults = await performSimilaritySearch(
              message,
              queryAnalysis.k || 3
            );
            break;
        }

        // Format search results for LLM context
        const formattedResults = formatSearchResults(searchResults);
        console.log(`📊 Found ${searchResults.length} relevant insights`);

        // Create system prompt with market intelligence context
        const systemPrompt = createSystemPrompt(
          formattedResults,
          queryAnalysis.searchType
        );

        // Stream the response
        await streamUnifiedResponse(
          controller,
          message,
          history,
          conversationId,
          systemPrompt,
          searchResults
        );

        console.log("🏁 Chat stream ending");
        controller.close();
      } catch (error) {
        console.error("Error in chat streaming:", error);
        controller.error(error);
      }
    },
  });

  return stream;
};

// Unified response streaming function
const streamUnifiedResponse = async (
  controller: ReadableStreamDefaultController,
  message: string,
  history: any[],
  conversationId: string,
  systemPrompt: string,
  searchResults: any[]
) => {
  let fullResponse = "";

  // Create system message
  const systemMessage = new AIMessage(systemPrompt);

  // Initialize LLM for streaming
  const llm = createLLM();

  // Create contextual history with system prompt
  const contextualHistory = [systemMessage, ...history];

  // Get streaming response from LLM
  const llmStream = await llm.stream(contextualHistory);

  // Process the stream
  for await (const chunk of llmStream) {
    if (chunk.content) {
      const contentStr =
        typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);
      fullResponse += contentStr;
      controller.enqueue(contentStr);
    }
  }

  // Add AI response to conversation history (without system message)
  const aiMessage = new AIMessage(fullResponse);
  history.push(aiMessage);
  updateConversationHistory(conversationId, history);

  // Generate cards using LLM with tools
  const generatedCards = await generateCardsWithLLM(
    message,
    fullResponse,
    searchResults
  );

  // Send generated cards as metadata if they add value
  if (generatedCards.length > 0) {
    const metadata = {
      timestamp: new Date().toISOString(),
      cards: generatedCards,
      replaceText: false,
    };
    await streamMetadataInChunks(controller, metadata);
  }
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

  for (let i = 0; i < metadataString.length; i += chunkSize) {
    const chunk = metadataString.slice(i, i + chunkSize);
    controller.enqueue(chunk);
  }
};

// Generate cards using LLM with tools
const generateCardsWithLLM = async (
  userMessage: string,
  aiResponse: string,
  searchResults: any[]
): Promise<any[]> => {
  try {
    console.log("🎴 Starting card generation process...");

    const llmWithTools = createLLMWithTools();

    const cardGenerationPrompt = `Based on this conversation and market intelligence data:

User: ${userMessage}
Assistant: ${aiResponse}

Available market intelligence: ${searchResults.length} relevant insights found.

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

    const response = await llmWithTools.invoke([
      new HumanMessage(cardGenerationPrompt),
    ]);

    const cards: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        try {
          let result;
          switch (toolCall.name) {
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
            cards.push(result);
          }
        } catch (error) {
          console.error(`❌ Error executing tool ${toolCall.name}:`, error);
        }
      }
    }

    console.log(`🎴 Card generation complete. Generated ${cards.length} cards`);
    return cards;
  } catch (error) {
    console.error("❌ Error generating cards:", error);
    return [];
  }
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
  history.length = 0;
  return {
    success: true,
    message: `Conversation history cleared for ${conversationId}`,
  };
};
