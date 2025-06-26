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
  performSimilaritySearch,
  getQuickWins,
  getHighValueActions,
  getActionsByValueEffortRatio,
  getInsightsByCompany,
  getInsightsByImpact,
} from "./vectorStore";
import { Document } from "@langchain/core/documents";
import { data } from "./data";

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

    // Extract quick wins from the actual data
    const quickWinActions = data.aiInsights
      .flatMap((insight) =>
        insight.insight.proposedActions
          .filter((action) => action.value >= 6 && action.effort <= 5) // High value, low-medium effort
          .map((action) => ({
            title: action.content.split(".")[0].trim(), // Use first sentence as title
            priority:
              action.value >= 8 ? "high" : action.value >= 7 ? "medium" : "low",
            reason: `Based on ${
              insight.company
            }'s recent activity: ${insight.insight.summary.substring(
              0,
              150
            )}...`,
            nextSteps: action.content,
            impact: `Value score: ${action.value}/10, Effort: ${action.effort}/10. ${insight.insight.title}`,
            company: insight.company,
            valueScore: action.value,
            effortScore: action.effort,
          }))
      )
      .sort(
        (a, b) => b.valueScore / b.effortScore - a.valueScore / a.effortScore
      ) // Sort by value-to-effort ratio
      .slice(0, 5); // Take top 5

    return {
      type: "quick-wins",
      title: title || "Market Intelligence Quick Wins",
      description:
        description ||
        "Actionable opportunities based on competitor analysis and market intelligence",
      items: quickWinActions.map((action) => ({
        title: action.title,
        priority: action.priority,
        reason: action.reason,
        nextSteps: action.nextSteps,
        impact: action.impact,
      })),
    };
  },
  {
    name: "generate_quick_wins",
    description:
      "ONLY use this tool when the user is explicitly asking you to GENERATE, CREATE, or SUGGEST NEW quick wins from scratch. Do NOT use this tool when the user is discussing, analyzing, prioritizing, implementing, or asking for help with EXISTING quick wins they already have (e.g., 'help me prioritize these quick wins', 'how do I implement this quick win', 'which of these should I do first', 'help me split this quick win into tasks'). Only use when they want you to suggest completely NEW quick wins they don't already have.",
    schema: z.object({
      title: z.string().describe("Title for quick wins").optional(),
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
        .describe("List of quick win items")
        .optional(),
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

  return llm.bindTools([generateQuickWinsTool]);
};

// Enhanced query analysis using LLM to detect if similarity search is needed
const analyzeQuery = async (
  query: string
): Promise<{
  needsSearch: boolean;
  searchType?: string | null;
  searchTerm?: string | null;
  k?: number;
}> => {
  try {
    const analysisLLM = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
      streaming: false,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const analysisPrompt = `You are analyzing a user's query to determine if it needs any market intelligence data or similarity search.

User query: "${query}"

Analyze if this query needs ANY kind of search or market intelligence:

NO SEARCH NEEDED for:
- Simple greetings: "hello", "hi", "hey", "good morning"
- Thanks/acknowledgments: "thanks", "thank you", "thx"
- Simple responses: "yes", "no", "ok", "okay", "sure"
- Casual conversation: "how are you", "what's up", "nice", "cool"
- Goodbyes: "bye", "goodbye", "see you later"

SEARCH NEEDED for:
- Business questions: "give me quick wins", "show me opportunities"
- Company inquiries: "what is Microsoft doing", "tell me about Apple"
- Market analysis: "who are my competitors", "market trends"
- Strategic requests: "high impact actions", "competitive analysis"
- Any request for business insights, data, or recommendations

If SEARCH is needed, also determine the type:
- "quickWins" - for quick wins, immediate actions
- "company" - for specific company questions (extract company name)
- "competitive" - for competitor/market analysis
- "similarity" - for general business questions

Respond in this exact JSON format:
{
  "needsSearch": true_or_false,
  "searchType": "type_if_search_needed_or_null",
  "searchTerm": "company_name_if_applicable_or_null",
  "k": number_of_results_if_search_needed_or_0
}

Examples:
- "Hello" → {"needsSearch": false, "searchType": null, "searchTerm": null, "k": 0}
- "Thanks!" → {"needsSearch": false, "searchType": null, "searchTerm": null, "k": 0}
- "How are you?" → {"needsSearch": false, "searchType": null, "searchTerm": null, "k": 0}
- "Give me quick wins" → {"needsSearch": true, "searchType": "quickWins", "searchTerm": null, "k": 5}
- "What is Microsoft doing?" → {"needsSearch": true, "searchType": "company", "searchTerm": "microsoft", "k": 8}
- "Who are my competitors?" → {"needsSearch": true, "searchType": "competitive", "searchTerm": null, "k": 12}

Respond with only the JSON, nothing else.`;

    const response = await analysisLLM.invoke([
      new HumanMessage(analysisPrompt),
    ]);
    const responseContent = response.content?.toString() || "";

    try {
      // Clean the response by removing markdown code blocks if present
      const cleanedResponse = responseContent
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const analysis = JSON.parse(cleanedResponse);
      console.log("🔍 LLM Search Decision:", analysis);
      return analysis;
    } catch (parseError) {
      console.error(
        "❌ Error parsing query analysis, using fallback:",
        parseError,
        "Raw response:",
        responseContent
      );
      // Fallback to no search for safety
      return { needsSearch: false, searchType: null, searchTerm: null, k: 0 };
    }
  } catch (error) {
    console.error("❌ Error in query analysis:", error);
    // Fallback to no search for safety
    return { needsSearch: false, searchType: null, searchTerm: null, k: 0 };
  }
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
): Promise<Readable> => {
  const history = getOrCreateConversationHistory(conversationId);

  // Add user message to history
  const userMessage = new HumanMessage(message);
  history.push(userMessage);

  // Create a Node.js Readable stream
  const stream = new Readable({
    read() {
      // Required method, but we'll push data manually
    },
  });

  // Process the request asynchronously
  (async () => {
    try {
      console.log("🤖 Processing message:", message);

      // First, determine if we should use brief response
      const withCards = await shouldStreamCards(message, []);
      console.log({ withCards });

      if (withCards) {
        // Stream the brief response first
        const briefResponse = "Let me identify actionables for you...";
        stream.push(briefResponse);
        setTimeout(() => {
          stream.push("\n\n__METADATA__");
        }, 500);
      }

      // Stream metadata start to show processing

      // Analyze query to determine search strategy
      console.log("analyzing query");
      const queryAnalysis = await analyzeQuery(message);
      console.log("query analysis done", queryAnalysis.searchType);

      let searchResults: any[] = [];

      // Only perform vector search if needed
      if (queryAnalysis.needsSearch) {
        console.log("🔍 Performing vector search...");

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
          case "competitive":
            // For competitive queries, use broad similarity search with more results
            searchResults = await performSimilaritySearch(
              message,
              queryAnalysis.k || 12
            );
            break;
          case "similarity":
          default:
            searchResults = await performSimilaritySearch(
              message,
              queryAnalysis.k || 10
            );
            break;
        }
        console.log("search results done");
      } else {
        console.log("🚀 Skipping vector search for simple conversation");
      }

      // Generate cards if this is a brief response
      let generatedCards: any[] = [];
      if (withCards) {
        const briefResponse = "Let me identify actionables for you...";
        console.log("generating cards");
        generatedCards = await generateCardsWithLLM(
          message,
          briefResponse,
          searchResults
        );
        console.log("cards generated");
      }

      // Send combined metadata with search results and cards
      if (withCards) {
        const metadata = {
          timestamp: new Date().toISOString(),
          searchComplete: true,
          resultsCount: searchResults.length,
          ...(generatedCards.length > 0 && {
            cards: generatedCards,
            replaceText: false,
          }),
        };
        stream.push(JSON.stringify(metadata));
        stream.push("__END_METADATA__");

        // Update conversation history with the actual content provided to user
        let fullResponse = "Let me identify actionables for you...";
        if (generatedCards.length > 0) {
          fullResponse +=
            "\n\nI've provided you with the following quick wins:\n";
          generatedCards.forEach((card, index) => {
            if (card.type === "quick-wins" && card.items) {
              card.items.forEach((item: any, itemIndex: number) => {
                fullResponse += `\n${itemIndex + 1}. ${
                  item.title
                }\n   Priority: ${item.priority}\n   Reason: ${item.reason}\n`;
              });
            }
          });
        }

        // Add comprehensive AI response to conversation history
        const aiMessage = new AIMessage(fullResponse);
        history.push(aiMessage);
        updateConversationHistory(conversationId, history);

        console.log("🏁 Chat stream ending (with cards)");
        stream.push(null);
        return;
      }

      // Format search results for LLM context
      const formattedResults = formatSearchResults(searchResults);
      console.log(`📊 Found ${searchResults.length} relevant insights`);

      // Create system prompt with market intelligence context
      const systemPrompt = createSystemPrompt(
        formattedResults,
        queryAnalysis.searchType || "general"
      );

      // Stream the response
      await streamUnifiedResponse(
        stream,
        message,
        history,
        conversationId,
        systemPrompt,
        searchResults,
        withCards
      );

      console.log("🏁 Chat stream ending");
      stream.push(null); // End the stream
    } catch (error) {
      console.error("Error in chat streaming:", error);
      stream.emit("error", error);
    }
  })();

  return stream;
};

// Unified response streaming function
const streamUnifiedResponse = async (
  stream: Readable,
  message: string,
  history: any[],
  conversationId: string,
  systemPrompt: string,
  searchResults: any[],
  shouldUseBriefResponse: boolean
) => {
  let fullResponse = "";

  if (shouldUseBriefResponse) {
    // Brief response and cards were already handled in main function
    // Conversation history was already updated there
    return;
  } else {
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
        stream.push(contentStr);
      }
    }

    // Add AI response to conversation history (without system message)
    const aiMessage = new AIMessage(fullResponse);
    history.push(aiMessage);
    updateConversationHistory(conversationId, history);

    // Cards are only generated in the main function, not here
  }
};

// LLM-based analysis to determine if we should use a brief response
const shouldStreamCards = async (
  message: string,
  searchResults: any[]
): Promise<boolean> => {
  try {
    const analysisLLM = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
      streaming: false,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const analysisPrompt = `You are analyzing a user's message to determine if they are requesting NEW quick wins that would be better served with interactive cards rather than a long text response.

User message: "${message}"

Available market intelligence: ${searchResults.length} relevant insights found.

Analyze if this user request is specifically asking for:
1. GENERATING or CREATING completely NEW quick wins from scratch
2. NEW immediate actions or opportunities they don't already have
3. Fresh actionable recommendations that would be better presented as interactive cards

Do NOT classify as BRIEF if the user is:
- Asking for help with EXISTING quick wins (prioritizing, implementing, analyzing)
- Discussing quick wins they already have
- Asking "which should I do first" or "help me prioritize these"
- Asking for implementation help or breaking down existing items

If the user is asking for completely NEW quick wins to be generated, respond with "BRIEF".
If the user is asking for analysis, explanations, discussions, help with existing items, or general information, respond with "FULL".

Examples:
- "Give me some quick wins" → BRIEF (generating new ones)
- "What are some immediate actions I can take?" → BRIEF (generating new ones)
- "Show me low effort high impact opportunities" → BRIEF (generating new ones)
- "Help me prioritize these quick wins" → FULL (working with existing ones)
- "Which of these should I do first?" → FULL (working with existing ones)
- "How do I implement this quick win?" → FULL (working with existing ones)
- "Help me understand this market trend" → FULL
- "Explain the competitive landscape" → FULL
- "What should I know about Microsoft's approach?" → FULL

Respond with only "BRIEF" or "FULL", nothing else.`;

    const response = await analysisLLM.invoke([
      new HumanMessage(analysisPrompt),
    ]);
    const decision = response.content?.toString().trim().toUpperCase();

    console.log(`🤔 LLM decision for response type: ${decision}`);
    return decision === "BRIEF";
  } catch (error) {
    console.error("❌ Error in brief response analysis:", error);
    // Default to full response if analysis fails
    return false;
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

Analyze if the user's request would benefit from interactive cards. Use the available tools to generate appropriate cards when:

1. User asks for GENERATING or CREATING completely NEW quick wins from scratch → use generate_quick_wins

Do NOT use tools when the user is:
- Asking for help with existing quick wins (prioritizing, implementing, analyzing)
- Discussing quick wins they already have
- Asking implementation questions about existing items

Only generate cards that add value to the conversation and when the user is specifically requesting NEW actionable quick wins to be created.`;

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
