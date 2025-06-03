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
- **IMPORTANT: Always include the source links provided in the search results at the end of your response**
- Format source links exactly as shown in the search results using markdown link format

Remember: You are an expert analyst helping with cybersecurity market intelligence and competitive analysis, with a focus on actionable, high-impact recommendations.

Important: Always provide the source links for the information in your response. The links are properties of the metadata object in the search results.

Example format for including sources:

## Sources
[summary of source title](https://example.com/link1)
..additional sources..

Make sure to always end the response with a question asking the user if they want assistance with moving forward with the recommendations, such as creating a plan, timeline, or next steps. Make sure that this question is formatted in such a way that the user won't miss it.`;
};

// Stream agent response with vector search context
export const streamAgentResponse = async (
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
          // Initialize vector store if needed
          await initializeVectorStore();

          const llm = createAgentLLM();

          // Analyze query and perform appropriate search
          const queryAnalysis = analyzeQuery(message);
          let searchResults: Document[] = [];

          console.log(`🤖 Agent analyzing query: "${message}"`);
          console.log(`🔍 Search strategy: ${queryAnalysis.searchType}`);

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
              console.log(
                `📤 Agent pushing chunk: "${contentStr.substring(0, 20)}..." (${
                  contentStr.length
                } chars)`
              );
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

          console.log("🏁 Agent stream ending");
          // End the stream
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
