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

// Initialize OpenAI ChatGPT for the agent
const createAgentLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4.1-mini",
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

  if (generatedResponse && generatedResponse.introText) {
    // Stream the LLM-generated intro text
    controller.enqueue(generatedResponse.introText);

    // Small delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (generatedResponse.cards && generatedResponse.cards.length > 0) {
      // Send the cards as the main content
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

      controller.enqueue(
        `\n\n__CARDS_REPLACE_CONTENT__${JSON.stringify(
          metadata
        )}__END_CARDS_REPLACE_CONTENT__`
      );
    } else {
      // Fallback to regular agent response if no cards generated
      await streamRegularAgentResponse(
        controller,
        message,
        history,
        conversationId,
        userMessage
      );
    }
  } else {
    // Fallback to regular agent response if no intro generated
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

  // Process the streaming response
  for await (const chunk of streamResponse) {
    const content = chunk.content;
    if (content) {
      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);
      fullResponse += contentStr;
      controller.enqueue(contentStr);

      // Small delay to ensure chunks are sent individually
      await new Promise((resolve) => setTimeout(resolve, 10));
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

  // Send structured metadata at the end (optional supplementary cards)
  const metadata = await generateAgentCardsWithLLM(
    message,
    fullResponse,
    searchResults
  );
  if (metadata) {
    metadata.replaceText = false; // Flag to indicate cards supplement text
    controller.enqueue(
      `\n\n__METADATA__${JSON.stringify(metadata)}__END_METADATA__`
    );
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

// Define the same tools for agent service
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
      description: z.string().nullable().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().nullable(),
            priority: z.enum(["high", "medium", "low"]),
            category: z.string(),
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
      "Generate quick wins card when user asks for immediate actions, things to do today/this week, or low-effort high-impact opportunities",
    schema: z.object({
      title: z.string().describe("Title for quick wins"),
      description: z.string().nullable().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().nullable(),
            value: z.number().nullable(),
            effort: z.number().nullable(),
            ratio: z.number().nullable(),
          })
        )
        .describe("List of quick win items"),
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
      "Generate competitive analysis card when user asks about competitors, competitive moves, market positioning, or how to respond to competitor actions",
    schema: z.object({
      title: z.string().describe("Title for competitive analysis"),
      description: z.string().nullable().describe("Optional description"),
      items: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().nullable(),
            competitor: z.string().nullable(),
            advantage: z.string().nullable(),
            priority: z.enum(["high", "medium", "low"]),
          })
        )
        .describe("List of competitive insights"),
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
      "Generate follow-up assistance suggestions to help the user continue the conversation or explore related topics",
    schema: z.object({
      title: z.string().describe("Title for assistance suggestions"),
      suggestions: z
        .array(z.string())
        .describe("List of suggested follow-up questions or actions"),
    }),
  }
);

// Create LLM with tools for card generation
const createLLMWithTools = () => {
  const llm = new ChatOpenAI({
    modelName: "gpt-4.1-mini",
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
    const response = await llmWithTools.invoke([
      new HumanMessage(dynamicPrompt),
    ]);

    // Extract intro text from the response
    const introText = response.content?.toString() || "";

    console.log(
      "📊 AGENT dynamic response received. Tool calls:",
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
    }

    console.log(
      `🎴 AGENT Dynamic response complete. Generated ${cards.length} cards`
    );

    return {
      introText: introText.trim(),
      cards,
    };
  } catch (error) {
    console.error("❌ Error generating agent dynamic response:", error);
    return null;
  }
};
