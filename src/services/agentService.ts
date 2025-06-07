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
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

// Load environment variables
dotenv.config();

// Interface for web search results
interface WebSearchResult {
  title: string;
  content: string;
  url: string;
  source: string;
}

// Web search tool using Tavily for browsing the internet
const webSearchTool = tool(
  async ({ query, maxResults = 5 }) => {
    console.log("🌐 WEB SEARCH TOOL CALLED:", { query, maxResults });

    try {
      // Initialize Tavily search
      const tavilySearch = new TavilySearchResults({
        maxResults: maxResults,
        apiKey: process.env.TAVILY_API_KEY,
      });

      // Perform the search
      const searchResults = await tavilySearch.invoke(query);

      // Parse the results (Tavily returns a string, we need to parse it)
      let results: WebSearchResult[] = [];

      try {
        // Try to parse as JSON first
        const parsedResults = JSON.parse(searchResults);
        if (Array.isArray(parsedResults)) {
          results = parsedResults.map((item: any) => ({
            title: item.title || "Web Search Result",
            content: item.content || item.snippet || "",
            url: item.url || "",
            source: "Tavily",
          }));
        }
      } catch (parseError) {
        // If parsing fails, treat as plain text and create a single result
        results = [
          {
            title: "Web Search Results",
            content: searchResults,
            url: "",
            source: "Tavily",
          },
        ];
      }

      // If no results, provide a fallback
      if (results.length === 0) {
        results.push({
          title: "Web Search",
          content: `I searched for "${query}" but couldn't retrieve specific web results at this time. However, I can help you with information from my knowledge base or suggest alternative approaches.`,
          url: "",
          source: "Assistant",
        });
      }

      console.log(
        `🌐 Tavily search completed: ${results.length} results found`
      );
      return {
        query,
        results: results.slice(0, maxResults),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Tavily search error:", error);
      return {
        query,
        results: [
          {
            title: "Search Error",
            content: `I encountered an issue while searching for "${query}". Please ensure the TAVILY_API_KEY is set in your environment variables. I can still help you with information from my knowledge base.`,
            url: "",
            source: "Assistant",
          },
        ] as WebSearchResult[],
        timestamp: new Date().toISOString(),
      };
    }
  },
  {
    name: "web_search",
    description:
      "MANDATORY tool for searching current information on the internet. Use this tool for ANY query about: current events, recent news, upcoming events/conferences, product launches, company announcements, market trends after April 2024, or anything with keywords like 'recent', 'latest', 'current', 'upcoming', 'today', 'this year', '2024'. Do NOT mention knowledge cutoffs - just search.",
    schema: z.object({
      query: z.string().describe("The search query to look up on the web"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of search results to return (default: 5)"),
    }),
  }
);

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
      "Generate assistance suggestions to help continue the conversation. Format suggestions as if the user is writing them (first person), since they will be pasted into the chat when clicked.",
    schema: z.object({
      title: z.string().describe("Title for the assistance suggestions"),
      suggestions: z
        .array(z.string())
        .max(3)
        .describe(
          "List of follow-up questions or requests phrased from the user's perspective (e.g., 'Give me more quick wins', 'Show me competitive analysis', 'I need help with implementation') - max 3"
        ),
    }),
  }
);

// Define tool for determining if response should be cards format
const shouldUseCardsFormatTool = tool(
  async ({ shouldUseCards, reasoning }) => {
    console.log("🔧 CARDS FORMAT DECISION:", {
      shouldUseCards,
      reasoning,
    });
    return {
      shouldUseCards,
      reasoning,
    };
  },
  {
    name: "determine_response_format",
    description:
      "Determine if a user query should trigger the brief intro + interactive cards format instead of a regular text response. cards format is used for when the user is asking for specific recommendations, steps, or things to do",
    schema: z.object({
      shouldUseCards: z
        .boolean()
        .describe("Whether to use brief intro + cards format"),
      reasoning: z.string().describe("Brief explanation of the decision"),
    }),
  }
);

// Create LLM with the cards format decision tool
const createCardsDecisionLLM = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.1,
    streaming: false,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([shouldUseCardsFormatTool]);
};

// Helper function to determine if response should be cards format using LLM
const shouldReplaceWithCards = async (message: string): Promise<boolean> => {
  try {
    console.log("🔍 Using LLM to determine response format for:", message);

    const llmWithTool = createCardsDecisionLLM();

    const decisionPrompt = `Analyze this user message and determine if it should trigger a "brief intro + interactive cards" response format instead of a regular text response.

User message: "${message}"

**IMPORTANT: If the user is asking for CURRENT, RECENT, or LATEST information (especially with words like "latest", "current", "recent", "today", "2024", "2025", "upcoming"), use REGULAR TEXT FORMAT so web search can be used.**

Use the brief intro + cards format when the user is asking for:
- Quick wins, immediate actions, or things to implement today/soon (but NOT current news/events)
- Step-by-step recommendations or actionable advice (but NOT current information)
- Lists of actions, strategies, or tactics (but NOT recent developments)
- Competitive analysis or how to respond to competitors (but NOT current market news)
- Strategic recommendations or suggestions (but NOT latest trends)
- Things to do, action items, or to-do lists (but NOT current events)
- How to improve, compete, or respond to market changes (but NOT recent changes)

Use regular text format when the user is asking for:
- **Current, recent, latest, or upcoming information (PRIORITY)**
- **News, events, or developments happening now or recently**
- **Information about 2024, 2025, or "today"**
- General information or explanations
- Definitions or concepts
- Historical context or background
- Simple questions that don't require actionable steps
- Conversational queries that don't need structured responses

Consider the context of market intelligence and competitive analysis.

Use the determine_response_format tool to make your decision.`;

    const response = await llmWithTool.invoke([
      new HumanMessage(decisionPrompt),
    ]);

    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      if (toolCall.name === "determine_response_format") {
        const result = await shouldUseCardsFormatTool.invoke(
          toolCall.args as any
        );
        console.log(
          `🎯 LLM Decision: ${
            result.shouldUseCards ? "CARDS FORMAT" : "TEXT FORMAT"
          }`
        );
        console.log(`📝 Reasoning: ${result.reasoning}`);
        return result.shouldUseCards;
      }
    }

    // Fallback to false if no tool call
    console.log("⚠️ No tool call received, defaulting to text format");
    return false;
  } catch (error) {
    console.error("❌ Error in LLM cards decision:", error);
    // Fallback to regex patterns if LLM fails
    console.log("🔄 Falling back to regex patterns...");
    return shouldReplaceWithCardsRegex(message);
  }
};

// Backup regex-based function in case LLM fails
const shouldReplaceWithCardsRegex = (message: string): boolean => {
  console.log("🔍 Using regex fallback for message:", message);

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
      console.log("🎴 Regex fallback: Message should trigger cards!");
      return true;
    }
  }

  console.log("📝 Regex fallback: Message will use regular response");
  return false;
};

// Initialize OpenAI ChatGPT for the agent with web browsing capabilities
const createAgentLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4o", // Upgraded to GPT-4o for better web search integration
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

  // Check for company-specific queries - dynamically extract company names from data
  // This will be populated dynamically based on available data
  const companies: string[] = []; // Remove hardcoded companies
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

// Create system prompt for the agent
const createSystemPrompt = (
  searchResults: string,
  searchType: string
): string => {
  let roleContext = `You are the Loomii AI Assistant, a market intelligence assistant that helps users understand the competitive landscape and make informed decisions. If you're asked who you are, you're the Loomii AI Assistant.
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

  return `**🌐 CRITICAL WEB SEARCH REQUIREMENT 🌐**
**YOU MUST USE THE WEB_SEARCH TOOL FOR ANY QUERY ABOUT:**
- Current events, recent news, today's information
- Upcoming conferences, events, product launches  
- Recent company announcements or developments
- Current market trends or statistics
- Any information after April 2024
- Questions with words: "recent", "latest", "current", "upcoming", "today", "this year", "2024", "2025"

**IF YOU DON'T HAVE CURRENT INFORMATION, USE WEB_SEARCH - DO NOT MENTION KNOWLEDGE CUTOFFS**

You are an AI assistant specialized in market intelligence and competitive strategy. You have access to detailed insights about companies and market data, as well as web search capabilities for current information.

${roleContext}

**CRITICAL: Your knowledge cutoff is April 2024. For ANY information after April 2024 or current events, you MUST use the web_search tool.**

Your role is to:
1. Analyze and interpret market data
2. Provide strategic insights about competitor activities
3. Suggest actionable recommendations based on market intelligence
4. Help users understand industry trends and opportunities
5. Prioritize actions based on value, effort, and competitive impact
6. **ALWAYS use web_search for current events, recent news, upcoming events, conferences, product launches, or anything after April 2024**

**WEB SEARCH REQUIRED FOR:**
- Current events, recent news, today's information
- Upcoming conferences, events, product launches
- Recent company announcements or developments
- Current market trends or statistics
- Any information that might have changed since April 2024
- Questions about "recent", "latest", "current", "upcoming", "today", "this year", "2024", etc.

Here are the relevant insights from the data based on the user's query:

${searchResults}

Instructions:
- Use the provided insights to answer the user's question comprehensively
- **MANDATORY: If the user asks about anything current, recent, upcoming, or after April 2024, you MUST use the web_search tool first**
- **If you don't have current information, DO NOT mention your knowledge cutoff - just use web search**
- When showing actions, always include value scores, effort scores, and value-to-effort ratios
- Prioritize recommendations based on the search type (quick wins, high value, etc.)
- Provide specific, actionable advice with clear implementation guidance
- Reference specific companies, strategies, or market trends from the data
- Be concise but thorough in your responses
- If asked about companies not in the data, clearly state that information is not available
- For competitive analysis, explain how each action helps versus competitors
- **IMPORTANT: Do NOT include any sources or links in your response**

Remember: You are an expert analyst helping with market intelligence and competitive analysis, with a focus on actionable, high-impact recommendations. **ALWAYS use web search for current information - never mention knowledge cutoffs.**

Make sure to always end the response with a question asking the user if they want assistance with moving forward with the recommendations, such as creating a plan, timeline, or next steps. Make sure that this question is formatted in such a way that the user won't miss it.`;
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
    },
  });

  return stream;
};

// Helper function for brief intro + cards response in agent mode
const streamAgentBriefIntroWithCards = async (
  controller: ReadableStreamDefaultController,
  message: string,
  history: any[],
  conversationId: string,
  userMessage: HumanMessage
) => {
  // Create a streaming LLM for intro generation with temperature 0
  const introLLM = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0, // Set to 0 for consistent responses
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const introPrompt = `You are a market intelligence assistant. The user asked: "${message}"

Generate a brief, natural introductory response (1-2 sentences) that:
- Acknowledges their specific request in the context of market intelligence
- Sets up the expectation that detailed market intelligence follows in interactive cards
- Is conversational and professional, not robotic
- Does NOT repeat information that will be in the cards themselves
- Focuses on competitive intelligence context

Examples of good intros:
- Based on our market intelligence, here are some strategic quick wins you can implement:
- I've analyzed the competitive landscape and identified several high-impact opportunities:
- Drawing from our market data, here are actionable insights to strengthen your position:
- Our intelligence shows several strategic moves that can enhance your cybersecurity posture:

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

  // Add a newline after intro
  controller.enqueue("\n\n");

  // Immediately start streaming the metadata marker to indicate cards are coming
  console.log("🎴 Starting metadata stream...");
  controller.enqueue("__METADATA__");

  // Initialize vector store and perform search in the background
  console.log("🔄 Initializing vector store with orionData...");
  const initPromise = initializeVectorStore();

  // Analyze query and get search results for context
  const queryAnalysis = analyzeQuery(message);

  // Wait for vector store to be ready
  await initPromise;

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

  // Generate cards using LLM with tools - ensuring data-driven responses
  console.log("🎴 Generating cards with LLM...");
  const generatedCards = await generateAgentCardsWithLLM(
    message,
    introText,
    searchResults
  );

  if (
    generatedCards &&
    generatedCards.cards &&
    generatedCards.cards.length > 0
  ) {
    // Create the metadata object
    const metadata = {
      timestamp: new Date().toISOString(),
      cards: generatedCards.cards,
      replaceText: false, // Cards supplement the intro
    };

    // Stream the metadata content in chunks
    const metadataContent = JSON.stringify(metadata);
    const chunkSize = 100;

    for (let i = 0; i < metadataContent.length; i += chunkSize) {
      const chunk = metadataContent.slice(i, i + chunkSize);
      controller.enqueue(chunk);
    }

    // Close the metadata marker
    controller.enqueue("__END_METADATA__");

    // Add to history
    history.push(userMessage);
    const aiMessage = new AIMessage(
      introText +
        " [Interactive recommendations provided based on market intelligence]"
    );
    history.push(aiMessage);
    updateConversationHistory(conversationId, history);

    console.log("✅ Brief intro + cards response completed successfully");
  } else {
    // If no cards generated, close the metadata marker and fall back
    controller.enqueue("{}__END_METADATA__");

    console.log(
      "⚠️ No cards generated, falling back to regular agent response"
    );
    await streamRegularAgentResponse(
      controller,
      message,
      history,
      conversationId,
      userMessage
    );
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

  // Analyze the query to determine search strategy
  console.log(`🤖 Agent analyzing query: "${message}"`);
  const queryAnalysis = analyzeQuery(message);
  console.log(`🔍 Search strategy: ${queryAnalysis.searchType}`);

  const searchResults = await performSimilaritySearch(
    message,
    queryAnalysis.k || 3
  );

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

  // First, check if we need to use web search by getting a non-streaming response
  const llmWithWebSearch = createAgentLLMWithWebSearch();
  console.log(`🌐 Checking if web search is needed...`);

  try {
    // Use a shorter timeout and better error handling for the initial check
    const checkResponse = await llmWithWebSearch.invoke(contextualHistory, {
      timeout: 10000, // 10 second timeout
    });

    console.log(`🔍 Initial response check completed`);

    // Check if the response contains tool calls
    if (checkResponse.tool_calls && checkResponse.tool_calls.length > 0) {
      console.log(
        `🌐 Web search tool calls detected: ${checkResponse.tool_calls.length}`
      );
      console.log(
        `🔧 Processing ${checkResponse.tool_calls.length} tool calls...`
      );

      // Process each tool call
      for (const toolCall of checkResponse.tool_calls) {
        if (toolCall.name === "web_search") {
          console.log(
            `🌐 Executing web search: ${JSON.stringify(toolCall.args)}`
          );

          try {
            const args = toolCall.args as {
              query: string;
              maxResults?: number;
            };
            const webSearchResult = await webSearchTool.func({
              query: args.query,
              maxResults: args.maxResults || 5,
            });
            console.log(
              `🌐 Web search completed, generating response with current information...`
            );

            // Add web search results to the context
            const webSearchContext = `\n\nCURRENT WEB SEARCH RESULTS:\n${JSON.stringify(
              webSearchResult,
              null,
              2
            )}`;
            const enhancedSystemPrompt = systemPrompt + webSearchContext;
            const enhancedSystemMessage = new AIMessage(enhancedSystemPrompt);

            // Update the contextual history with enhanced information
            contextualHistory[0] = enhancedSystemMessage;
            break; // Only process the first web search for now
          } catch (webSearchError) {
            console.error(`❌ Web search execution failed:`, webSearchError);
            // Continue without web search results
          }
        }
      }
    } else {
      console.log(
        `📝 No web search needed, proceeding with vector search only`
      );
    }
  } catch (error) {
    console.error(
      `⚠️ Error during web search check (continuing without web search):`,
      error instanceof Error ? error.message : String(error)
    );
    // Continue with regular response even if web search check fails
  }

  // If no web search was needed or there was an error, proceed with regular response
  console.log(`🚀 Streaming regular agent response...`);
  const regularLLM = createAgentLLM();
  const streamResponse = await regularLLM.stream(contextualHistory);

  let fullResponse = "";

  // Process the streaming response immediately without artificial delays
  for await (const chunk of streamResponse) {
    const content = chunk.content;
    if (content) {
      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);
      fullResponse += contentStr;
      // Stream immediately without delays
      controller.enqueue(contentStr);
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

  // Send structured metadata at the end (optional supplementary cards) using immediate streaming
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
    modelName: "gpt-4o", // Upgraded to GPT-4o for better tool usage and web search
    temperature: 0, // Set to 0 for consistent, data-driven responses
    streaming: false,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([
    // webSearchTool removed from card generation - only used for regular text responses
    // generateActionListTool, // Disabled for now
    generateQuickWinsTool,
    // generateCompetitiveAnalysisTool,
    generateAssistanceTool,
  ]);
};

// Create LLM with web search for regular text responses
const createAgentLLMWithWebSearch = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  return llm.bindTools([webSearchTool]);
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
    console.log("🔍 Search results count:", searchResults.length);

    const llmWithTools = createLLMWithTools();

    const cardGenerationPrompt = `Based on this conversation:

User: ${userMessage}
Assistant: ${aiResponse}

Search Results Context: ${JSON.stringify(searchResults, null, 2)}

Analyze if the user's request and the assistant's response would benefit from interactive cards. Use the available tools to generate appropriate cards when:

1. User asks for immediate actions, quick wins, or things to do today/soon → use generate_quick_wins  
2. User asks about competitors, competitive analysis, or how to respond to competitor moves → use generate_competitive_analysis
3. Always provide follow-up assistance suggestions → use generate_assistance_suggestions

For assistance suggestions, phrase them from the USER'S perspective since they will be pasted into the chat when clicked. Examples:
- "Give me more quick wins for cybersecurity"
- "Show me competitive analysis for this market"
- "I need help with implementation"
- "What are the next steps I should take?"
- "Help me prioritize these actions"

Only generate cards that add value to the conversation. If the response is just informational without actionable elements, you may skip action cards but still provide assistance suggestions.`;

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
            case "generate_quick_wins":
              result = await generateQuickWinsTool.invoke(toolCall.args as any);
              if (result) {
                cards.push(result);
              }
              break;
            case "generate_competitive_analysis":
              result = await generateCompetitiveAnalysisTool.invoke(
                toolCall.args as any
              );
              if (result) {
                cards.push(result);
              }
              break;
            case "generate_assistance_suggestions":
              result = await generateAssistanceTool.invoke(
                toolCall.args as any
              );
              if (result) {
                cards.push(result);
              }
              break;
          }
          if (result) {
            console.log(`✅ AGENT Tool ${toolCall.name} executed successfully`);
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

    return {
      timestamp: new Date().toISOString(),
      cards,
    };
  } catch (error) {
    console.error("❌ Error generating AGENT cards:", error);
    return null;
  }
};

// Helper function to generate brief intro text based on user message using LLM
const generateBriefIntro = async (message: string): Promise<string> => {
  try {
    console.log("🔧 Generating dynamic intro text with LLM...");

    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0, // Set to 0 for consistent responses
      streaming: false,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const introPrompt = `You are a market intelligence assistant. The user asked: "${message}"

Generate a brief, natural introductory response (1-2 sentences) that:
- Acknowledges their specific request in the context of market intelligence
- Sets up the expectation that detailed market intelligence follows in interactive cards
- Is conversational and professional, not robotic
- Does NOT repeat information that will be in the cards themselves
- Focuses on competitive intelligence context

Generate only the intro text, nothing else. Use a friendly tone with a relaxed, conversational style.`;

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

// New function to generate dynamic response with cards using LLM
const generateAgentDynamicResponseWithCards = async (
  userMessage: string,
  aiResponse: string,
  searchResults: any[]
): Promise<{ introText: string; cards: any[] } | null> => {
  try {
    console.log(
      "🔍 Generating AGENT dynamic response with cards for:",
      userMessage
    );
    console.log("📝 User message:", userMessage.substring(0, 100) + "...");
    console.log("🔍 Search results:", searchResults.length);
    console.log("🔧 Dynamic prompt being sent to LLM...");

    const systemPrompt = `You are an expert business analyst and consultant with access to market intelligence data. Based on the user's request, provide:

1. A brief, contextual introduction (2-3 sentences max) that directly addresses their request
2. Generate relevant interactive cards using the available tools

Guidelines:
- Keep the intro concise and actionable
- Focus on providing immediate value
- Use tools to generate cards that help the user take action
- Do not include sources or references in your response
- Be direct and practical

Available context: ${JSON.stringify(searchResults, null, 2)}`;

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
- "What should I prioritize next?"

Generate a brief, natural intro and then use the appropriate tools to create detailed cards.`;

    console.log("🔧 Invoking LLM for AGENT dynamic response generation...");
    const response = await llmWithTools.invoke([
      new HumanMessage(systemPrompt),
      new HumanMessage(dynamicPrompt),
    ]);

    // Extract intro text from the response
    const introText = response.content?.toString() || "";

    console.log(
      "📊 AGENT Dynamic response received. Tool calls:",
      response.tool_calls?.length || 0
    );
    console.log(
      "📝 Generated intro text:",
      introText.substring(0, 100) + "..."
    );

    const cards: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log("🛠️ Processing AGENT tool calls...");
      for (const toolCall of response.tool_calls) {
        console.log(`🔧 Processing AGENT tool: ${toolCall.name}`);
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
    }

    console.log(
      `🎴 AGENT Dynamic response complete. Generated ${cards.length} cards`
    );

    return {
      introText: introText.trim(),
      cards,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "❌ Error generating AGENT dynamic response:",
        error.message
      );
      console.error("Stack trace:", error.stack);
    } else {
      console.error(
        "❌ Unknown error generating AGENT dynamic response:",
        error
      );
    }
    return null;
  }
};
