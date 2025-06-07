import { Readable } from "stream";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";
import {
  performSimilaritySearch,
  performSimilaritySearchWithScore,
  getInsightsByCompany,
  getInsightsByImpact,
  initializeVectorStore,
  getQuickWins,
  getHighValueActions,
  getActionsByValueEffortRatio,
} from "./vectorStore";
import dotenv from "dotenv";
import {
  getOrCreateConversationHistory,
  updateConversationHistory,
} from "./conversationHistory";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Define tools for the LLM to generate cards
const generateActionListTool = tool(
  async ({ title, items, description }) => {
    console.log("🔧 AGENT TOOL CALLED: generate_action_list", {
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
    console.log("🔧 AGENT TOOL CALLED: generate_quick_wins", {
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
      "Generate a quick wins card when the user asks for immediate actions or things to do today/soon",
    schema: z.object({
      title: z.string().describe("Title for the quick wins"),
      description: z.string().optional().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            value: z.number().min(1).max(10).describe("Value score 1-10"),
            effort: z.number().min(1).max(10).describe("Effort score 1-10"),
            ratio: z.number().describe("Value-to-effort ratio"),
          })
        )
        .describe("List of quick win items with value/effort scores"),
    }),
  }
);

const generateCompetitiveAnalysisTool = tool(
  async ({ title, items, description }) => {
    console.log("🔧 AGENT TOOL CALLED: generate_competitive_analysis", {
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
      "Generate a competitive analysis card when the user asks about competitors or competitive positioning",
    schema: z.object({
      title: z.string().describe("Title for the competitive analysis"),
      description: z.string().optional().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            impact: z
              .enum(["high", "medium", "low"])
              .describe("Expected impact level"),
            timeframe: z.string().describe("Implementation timeframe"),
          })
        )
        .describe("List of competitive response items"),
    }),
  }
);

const generateAssistanceTool = tool(
  async ({ title, suggestions }) => {
    console.log("🔧 AGENT TOOL CALLED: generate_assistance_suggestions", {
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
      "Generate assistance suggestions to help continue the conversation",
    schema: z.object({
      title: z.string().describe("Title for the assistance suggestions"),
      suggestions: z
        .array(z.string())
        .max(3)
        .describe("List of follow-up questions or suggestions (max 3)"),
    }),
  }
);

// Initialize OpenAI ChatGPT for the agent
const createAgentLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
};

// Format search results for the LLM context
const formatSearchResults = (results: Document[]): string => {
  if (results.length === 0) {
    return "No relevant insights found in the orionData.";
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
    lowerQuery.includes("biggest impact") ||
    lowerQuery.includes("strategic")
  ) {
    return { searchType: "highValue", k: 5 };
  }

  // Check for value-effort ratio queries
  if (
    lowerQuery.includes("roi") ||
    lowerQuery.includes("return on investment") ||
    lowerQuery.includes("efficient") ||
    lowerQuery.includes("bang for buck") ||
    lowerQuery.includes("value versus") ||
    lowerQuery.includes("value vs")
  ) {
    return { searchType: "valueEffort", k: 5 };
  }

  // Check for company-specific queries
  const companies = ["digital guardian", "zscaler", "forcepoint"];
  for (const company of companies) {
    if (lowerQuery.includes(company)) {
      return { searchType: "company", searchTerm: company };
    }
  }

  // Check for impact-specific queries
  if (lowerQuery.includes("high impact")) {
    return { searchType: "impact", searchTerm: "high" };
  }
  if (lowerQuery.includes("medium impact")) {
    return { searchType: "impact", searchTerm: "medium" };
  }
  if (lowerQuery.includes("low impact")) {
    return { searchType: "impact", searchTerm: "low" };
  }

  // Default to similarity search
  return { searchType: "similarity", k: 3 };
};

// Create system prompt for the agent
const createSystemPrompt = (
  searchResults: string,
  searchType: string
): string => {
  let roleContext = `You are the Loomii AI Assistant, a competitor intelligence assistant that helps user understand the competitive landscape and make informed decisions. If you're asked who you are, you're the Loomii AI Assistant.
  `;

  if (searchType === "quickWins") {
    roleContext = `
You are analyzing QUICK WINS - actions that provide high value with relatively low effort. Focus on:
- Actions that can be implemented quickly (today or this week)
- High value-to-effort ratios
- Immediate competitive advantages
- Low-risk, high-return opportunities`;
  } else if (searchType === "highValue") {
    roleContext = `
You are analyzing HIGH-VALUE ACTIONS - strategic moves that provide maximum competitive advantage. Focus on:
- Actions with the highest value scores
- Strategic long-term benefits
- Market positioning advantages
- Competitive differentiation opportunities`;
  } else if (searchType === "valueEffort") {
    roleContext = `
You are analyzing VALUE-TO-EFFORT RATIOS - the most efficient actions for competitive advantage. Focus on:
- Return on investment (ROI)
- Efficiency of implementation
- Resource optimization
- Maximum impact per unit of effort`;
  }

  return `You are an AI assistant specialized in cybersecurity market intelligence and competitive strategy. You have access to detailed insights about cybersecurity companies including Digital Guardian, Zscaler, and Forcepoint.

${roleContext}

Your role is to:
1. Analyze and interpret cybersecurity market data
2. Provide strategic insights about competitor activities
3. Suggest actionable recommendations based on market intelligence
4. Help users understand industry trends and opportunities
5. Prioritize actions based on value, effort, and competitive impact

Here are the relevant insights from the orionData based on the user's query:

${searchResults}

Instructions:
- Use the provided insights to answer the user's question comprehensively
- When showing actions, always include value scores, effort scores, and value-to-effort ratios
- Prioritize recommendations based on the search type (quick wins, high value, etc.)
- Provide specific, actionable advice with clear implementation guidance
- Reference specific companies, strategies, or market trends from the data
- Be concise but thorough in your responses
- If asked about companies not in the data, clearly state that information is not available
- For competitive analysis, explain how each action helps versus competitors
- **IMPORTANT: Always include the source links at the end of your response**
- Format source links exactly as shown in the search results using markdown link format

Remember: You are an expert analyst helping with cybersecurity market intelligence and competitive analysis, with a focus on actionable, high-impact recommendations.

Important: Always provide the source links for the information in your response. The links are properties of the metadata object in the search results.

Example format for including sources:

## Sources
[Source 1](https://example.com/link1)
[Source 2](https://example.com/link2)

Make sure to always end the response with a question asking the user if they want assistance with moving forward with the recommendations, such as creating a plan, timeline, or next steps. Make sure that this question is formatted in such a way that the user won't miss it.`;
};

// Helper function to stream metadata in chunks
const streamMetadataInChunks = async (
  controller: ReadableStreamDefaultController,
  metadata: any,
  chunkSize: number = 30
) => {
  const metadataString = `\n\n__METADATA__${JSON.stringify(
    metadata
  )}__END_METADATA__`;

  // Stream the metadata string in chunks with noticeable delays
  for (let i = 0; i < metadataString.length; i += chunkSize) {
    const chunk = metadataString.slice(i, i + chunkSize);
    controller.enqueue(chunk);

    // Longer delay between chunks for more noticeable streaming
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

// Stream agent response with vector search context
export const streamAgentResponse = async (
  message: string,
  conversationId: string = "default"
): Promise<ReadableStream> => {
  const history = getOrCreateConversationHistory(conversationId);
  const userMessage = new HumanMessage(message);

  const stream = new ReadableStream({
    async start(controller) {
      // Start streaming immediately in background
      setImmediate(async () => {
        try {
          // Check if this should be a brief intro + cards response
          const shouldUseCardsOnly = await shouldReplaceWithCards(message);

          if (shouldUseCardsOnly) {
            console.log("🎴 Generating AGENT brief intro + cards response...");

            // Use brief intro + cards approach
            await streamAgentBriefIntroWithCards(
              controller,
              message,
              history,
              conversationId,
              userMessage
            );
          } else {
            // Regular agent response with optional cards
            await streamRegularAgentResponse(
              controller,
              message,
              history,
              conversationId,
              userMessage
            );
          }

          console.log("🏁 Agent stream ending");
          controller.close();
        } catch (error) {
          console.error("Error in agent streaming:", error);
          controller.error(error);
        }
      });
    },
  });

  return stream;
};

// Helper function to determine if response should be cards-only
const shouldReplaceWithCards = async (message: string): Promise<boolean> => {
  console.log("🔍 Checking if message should trigger cards:", message);

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

// Helper function for brief intro + cards response in agent mode
const streamAgentBriefIntroWithCards = async (
  controller: ReadableStreamDefaultController,
  message: string,
  history: any[],
  conversationId: string,
  userMessage: HumanMessage
) => {
  // Initialize vector store and get search results for context
  console.log("🔄 Initializing vector store with orionData...");
  await initializeVectorStore();

  // Analyze query and get search results for context
  const queryAnalysis = analyzeQuery(message);
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
      searchResults = await getActionsByValueEffortRatio(queryAnalysis.k || 5);
      break;
    case "company":
      if (queryAnalysis.searchTerm) {
        searchResults = await getInsightsByCompany(queryAnalysis.searchTerm);
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

  // Let the LLM generate both intro text and cards dynamically with search context
  const generatedResponse = await generateAgentDynamicResponseWithCards(
    message,
    "",
    searchResults
  );

  if (
    generatedResponse &&
    generatedResponse.introText &&
    generatedResponse.cards &&
    generatedResponse.cards.length > 0
  ) {
    // Stream the LLM-generated intro text in smaller chunks with longer delays
    const introText = generatedResponse.introText;
    const introChunkSize = 5; // Much smaller chunks for more noticeable streaming

    for (let i = 0; i < introText.length; i += introChunkSize) {
      const chunk = introText.slice(i, i + introChunkSize);
      // Ensure we're streaming raw text, not JSON-stringified text
      controller.enqueue(chunk);
      await new Promise((resolve) => setTimeout(resolve, 80)); // Much longer delay
    }

    // Longer delay before metadata for clear separation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Send the cards as the main content using chunked streaming
    const metadata = {
      timestamp: new Date().toISOString(),
      cards: generatedResponse.cards,
      replaceText: false, // Cards supplement the intro
    };

    // Add the intro + cards indication to history
    history.push(userMessage);
    const aiMessage = new AIMessage(
      generatedResponse.introText +
        " [Interactive recommendations provided based on market intelligence]"
    );
    history.push(aiMessage);
    updateConversationHistory(conversationId, history);

    // Stream metadata in chunks with noticeable delays
    await streamMetadataInChunks(controller, metadata);
  } else {
    // If no intro or cards generated, provide a simple fallback message
    const fallbackMessage =
      "I understand your request. Let me provide some insights based on our market intelligence.";

    // Stream fallback message in smaller chunks with delays
    const fallbackChunkSize = 5;
    for (let i = 0; i < fallbackMessage.length; i += fallbackChunkSize) {
      const chunk = fallbackMessage.slice(i, i + fallbackChunkSize);
      controller.enqueue(chunk);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    // Add to history
    history.push(userMessage);
    const aiMessage = new AIMessage(fallbackMessage);
    history.push(aiMessage);
    updateConversationHistory(conversationId, history);
  }
};

// Helper function for regular agent streaming
const streamRegularAgentResponse = async (
  controller: ReadableStreamDefaultController,
  message: string,
  history: any[],
  conversationId: string,
  userMessage: HumanMessage
) => {
  // Initialize vector store if needed (handled internally by functions)
  console.log("🔄 Initializing vector store with orionData...");
  await initializeVectorStore();

  const llm = createAgentLLM();

  // Analyze the query to determine search strategy
  console.log(`🤖 Agent analyzing query: "${message}"`);
  const queryAnalysis = analyzeQuery(message);
  console.log(`🔍 Search strategy: ${queryAnalysis.searchType}`);

  let searchResults: any[] = [];

  // Execute search based on analysis
  switch (queryAnalysis.searchType) {
    case "quickWins":
      searchResults = await getQuickWins(queryAnalysis.k || 5);
      break;
    case "highValue":
      searchResults = await getHighValueActions(queryAnalysis.k || 5);
      break;
    case "valueEffort":
      searchResults = await getActionsByValueEffortRatio(queryAnalysis.k || 5);
      break;
    case "company":
      if (queryAnalysis.searchTerm) {
        searchResults = await getInsightsByCompany(queryAnalysis.searchTerm);
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

  // Format search results for context
  const formattedResults = formatSearchResults(searchResults);

  // Create system message with search context
  const systemPrompt = createSystemPrompt(
    formattedResults,
    queryAnalysis.searchType
  );
  const systemMessage = new AIMessage(systemPrompt);

  // Create context-aware conversation
  const contextualHistory = [systemMessage, ...history, userMessage];

  console.log(`📊 Found ${searchResults.length} relevant insights`);
  console.log(`🚀 Streaming agent response...`);

  // Stream response from LLM with context
  const streamResponse = await llm.stream(contextualHistory);

  let fullResponse = "";

  // Process the streaming response with longer delays
  for await (const chunk of streamResponse) {
    const content = chunk.content;
    if (content) {
      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);
      fullResponse += contentStr;
      // Ensure we're streaming raw text, not JSON-stringified text
      controller.enqueue(contentStr);

      // Longer delay to ensure chunks are sent individually and noticeably
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Add messages to history (without system message)
  history.push(userMessage);
  const aiMessage = new AIMessage(fullResponse);
  history.push(aiMessage);

  // Update conversation history
  if (conversationId) {
    updateConversationHistory(conversationId, history);
  }

  // Delay before metadata for clear separation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Send structured metadata at the end (optional supplementary cards) using chunked streaming with noticeable delays
  const metadata = await generateAgentCardsWithLLM(
    message,
    fullResponse,
    searchResults
  );
  if (metadata) {
    metadata.replaceText = false; // Flag to indicate cards supplement text
    await streamMetadataInChunks(controller, metadata);
  }
};

// Get agent conversation history
export const getAgentConversationHistory = async (
  conversationId: string
): Promise<BaseMessage[]> => {
  return getOrCreateConversationHistory(conversationId) || [];
};

// Clear agent conversation history
export const clearAgentConversationHistory = async (
  conversationId: string
): Promise<void> => {
  updateConversationHistory(conversationId, []);
};

// Enhanced search orionData with new search types
export const searchOrionData = async (
  query: string,
  options: {
    searchType?:
      | "similarity"
      | "company"
      | "impact"
      | "quickWins"
      | "highValue"
      | "valueEffort";
    k?: number;
    includeScores?: boolean;
    minValue?: number;
    maxEffort?: number;
    minRatio?: number;
  } = {}
): Promise<{
  results: Document[];
  scores?: number[];
  searchType: string;
  query: string;
  metadata?: any;
}> => {
  await initializeVectorStore();

  const {
    searchType = "similarity",
    k = 3,
    includeScores = false,
    minValue = 6,
    maxEffort = 4,
    minRatio = 1.5,
  } = options;

  let results: Document[] = [];
  let scores: number[] | undefined;
  let metadata: any = {};

  console.log(`🔍 Direct search: "${query}" (type: ${searchType})`);

  try {
    switch (searchType) {
      case "quickWins":
        results = await getQuickWins(k, minValue, maxEffort);
        metadata = { minValue, maxEffort, criteria: "high value, low effort" };
        break;
      case "highValue":
        results = await getHighValueActions(k, minValue);
        metadata = { minValue, criteria: "high value actions" };
        break;
      case "valueEffort":
        results = await getActionsByValueEffortRatio(k, minRatio);
        metadata = { minRatio, criteria: "high value-to-effort ratio" };
        break;
      case "company":
        results = await getInsightsByCompany(query);
        break;
      case "impact":
        results = await getInsightsByImpact(query as "high" | "medium" | "low");
        break;
      case "similarity":
      default:
        if (includeScores) {
          const resultsWithScores = await performSimilaritySearchWithScore(
            query,
            k
          );
          results = resultsWithScores.map(([doc]) => doc);
          scores = resultsWithScores.map(([, score]) => score);
        } else {
          results = await performSimilaritySearch(query, k);
        }
        break;
    }

    console.log(`📊 Search completed: ${results.length} results found`);

    return {
      results,
      scores,
      searchType,
      query,
      metadata,
    };
  } catch (error) {
    console.error("❌ Error in searchOrionData:", error);
    throw error;
  }
};

// Create LLM with tools for card generation
const createLLMWithTools = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.2,
    streaming: false,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([
    generateActionListTool,
    generateQuickWinsTool,
    generateCompetitiveAnalysisTool,
    generateAssistanceTool,
  ]);
};

// Generate cards using LLM with tools for agent responses
const generateAgentCardsWithLLM = async (
  userMessage: string,
  aiResponse: string,
  searchResults: any
): Promise<any> => {
  try {
    console.log("🎴 Starting AGENT card generation process...");
    console.log("📝 User message:", userMessage.substring(0, 100) + "...");
    console.log("🤖 AI response length:", aiResponse.length);
    console.log("🔍 Search results count:", searchResults?.length || 0);

    const llmWithTools = createLLMWithTools();

    const cardGenerationPrompt = `Based on this cybersecurity market intelligence conversation:

User: ${userMessage}
Assistant: ${aiResponse}

The assistant used vector search and found ${
      searchResults?.length || 0
    } relevant insights from the cybersecurity market data.

Analyze if this conversation would benefit from interactive cards. Use the available tools to generate appropriate cards when:

1. User asks for recommendations, steps, or actionable advice → use generate_action_list
2. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
3. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
4. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

Focus on cybersecurity market intelligence context. Extract value/effort scores, competitive insights, and actionable recommendations from the response.`;

    console.log("🔧 Invoking AGENT LLM with tools for card generation...");
    const response = await llmWithTools.invoke([
      new HumanMessage(cardGenerationPrompt),
    ]);

    console.log(
      "📊 AGENT LLM response received. Tool calls:",
      response.tool_calls?.length || 0
    );

    const cards: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log("🛠️ Processing AGENT tool calls...");
      for (const toolCall of response.tool_calls) {
        console.log(`🔧 Processing AGENT tool: ${toolCall.name}`);
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
            console.log(`✅ AGENT Tool ${toolCall.name} executed successfully`);
            cards.push(result);
          }
        } catch (error) {
          console.error(
            `❌ Error executing AGENT tool ${toolCall.name}:`,
            error
          );
        }
      }
    } else {
      console.log("ℹ️ No tool calls generated by AGENT LLM");
    }

    console.log(
      `🎴 AGENT Card generation complete. Generated ${cards.length} cards`
    );

    return cards.length > 0
      ? {
          timestamp: new Date().toISOString(),
          cards,
        }
      : null;
  } catch (error) {
    console.error("❌ Error generating agent cards:", error);
    return null;
  }
};

// Helper function to generate brief intro text based on user message using LLM
const generateBriefIntro = async (message: string): Promise<string> => {
  try {
    console.log("🔧 Generating dynamic intro text with LLM...");

    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      streaming: false,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const introPrompt = `You are a cybersecurity market intelligence assistant. The user asked: "${message}"

Generate a brief, natural introductory response (1-2 sentences) that:
- Acknowledges their specific request in the context of cybersecurity market intelligence
- Sets up the expectation that detailed market intelligence follows in interactive cards
- Is conversational and professional, not robotic
- Does NOT repeat information that will be in the cards themselves
- Focuses on cybersecurity/competitive intelligence context

Examples of good intros:
- "Based on our cybersecurity market intelligence, here are some strategic quick wins you can implement:"
- "I've analyzed the competitive landscape and identified several high-impact opportunities:"
- "Drawing from our market data, here are actionable insights to strengthen your position:"
- "Our intelligence shows several strategic moves that can enhance your cybersecurity posture:"

Generate only the intro text, nothing else.`;

    const response = await llm.invoke([new HumanMessage(introPrompt)]);
    const introText =
      response.content?.toString() ||
      "Based on our market intelligence, here are some strategic insights:";

    console.log("📝 LLM-generated intro text:", introText);
    return introText;
  } catch (error) {
    console.error("❌ Error generating intro text with LLM:", error);
    // Fallback to a generic intro if LLM fails
    return "Based on our market intelligence, here are some strategic insights:";
  }
};

// New function to generate dynamic response with cards using LLM for agent mode
const generateAgentDynamicResponseWithCards = async (
  userMessage: string,
  aiResponse: string,
  searchResults: any[]
): Promise<{ introText: string; cards: any[] } | null> => {
  try {
    console.log("🎴 Starting AGENT dynamic response generation...");
    console.log("📝 User message:", userMessage.substring(0, 100) + "...");
    console.log("🔍 Search results count:", searchResults?.length || 0);

    const llmWithTools = createLLMWithTools();

    const dynamicPrompt = `The user asked: "${userMessage}"

I have access to ${
      searchResults?.length || 0
    } relevant cybersecurity market intelligence insights from the vector database.

Your task is to:
1. Generate an appropriate brief introductory response (1-2 sentences) that acknowledges their request in the context of cybersecurity market intelligence
2. Use the available tools to create interactive cards that provide detailed, data-driven answers

Guidelines for the intro:
- Be natural and conversational, not robotic
- Acknowledge what they're asking for specifically in a cybersecurity/competitive intelligence context
- Set up the expectation that detailed market intelligence follows in the cards
- Don't repeat information that will be in the cards
- Examples of good intros:
  * "Based on our market intelligence, here are some strategic recommendations:"
  * "I've analyzed the competitive landscape and identified several opportunities:"
  * "Drawing from cybersecurity market data, here are actionable insights:"

Use the tools to generate cards when:
1. User asks for recommendations, steps, or actionable advice → use generate_action_list
2. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
3. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
4. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

Focus on cybersecurity market intelligence context. Extract value/effort scores, competitive insights, and actionable recommendations.

Generate a brief, natural intro and then use the appropriate tools to create detailed cards based on the market intelligence data.`;

    console.log("🔧 Invoking AGENT LLM for dynamic response generation...");
    console.log(
      "📋 Prompt being sent:",
      dynamicPrompt.substring(0, 200) + "..."
    );

    const response = await llmWithTools.invoke([
      new HumanMessage(dynamicPrompt),
    ]);

    // Extract intro text from the response
    let introText = response.content?.toString() || "";

    console.log(
      "📊 AGENT dynamic response received. Tool calls:",
      response.tool_calls?.length || 0
    );
    console.log(
      "📝 Generated intro text:",
      introText.substring(0, 100) + "..."
    );
    console.log("🔍 Full response content:", response.content);
    console.log(
      "🛠️ Tool calls details:",
      JSON.stringify(response.tool_calls, null, 2)
    );

    const cards: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log("🛠️ Processing AGENT tool calls...");
      for (const toolCall of response.tool_calls) {
        console.log(`🔧 Processing AGENT tool: ${toolCall.name}`);
        console.log(`🔧 Tool args:`, JSON.stringify(toolCall.args, null, 2));
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
            console.log(`✅ AGENT Tool ${toolCall.name} executed successfully`);
            console.log(`📋 Tool result:`, JSON.stringify(result, null, 2));
            cards.push(result);
          }
        } catch (error) {
          console.error(
            `❌ Error executing AGENT tool ${toolCall.name}:`,
            error
          );
        }
      }
    } else {
      console.log("ℹ️ No tool calls generated by AGENT LLM");
      console.log("🔍 This might be because:");
      console.log("  - The LLM didn't understand the prompt");
      console.log("  - The tools aren't properly bound");
      console.log("  - The response format is unexpected");
    }

    // If no intro text was generated but we have cards, generate a fallback intro
    if (!introText.trim() && cards.length > 0) {
      console.log("🔧 No intro text generated, creating fallback intro...");
      introText = await generateBriefIntro(userMessage);
      console.log("📝 Fallback intro text:", introText);
    }

    console.log(
      `🎴 AGENT Dynamic response complete. Generated ${cards.length} cards`
    );

    if (!introText && cards.length === 0) {
      console.log("⚠️ No intro text or cards generated - returning null");
      return null;
    }

    return {
      introText: introText.trim(),
      cards,
    };
  } catch (error) {
    console.error("❌ Error generating agent dynamic response:", error);
    console.error(
      "❌ Error details:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return null;
  }
};
