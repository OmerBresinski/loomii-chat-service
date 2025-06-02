import { OpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "@langchain/core/documents";
import { orion_data, AiInsight } from "./orionData";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

let vectorStore: FaissStore | null = null;

// Convert AiInsight to Document format for vector store (original approach)
const createDocumentFromInsight = (insight: AiInsight): Document => {
  const content = `
Company: ${insight.company}
Homepage: ${insight.homepage}
Title: ${insight.insight.title}
Summary: ${insight.insight.summary}
Impact: ${insight.impact}
Proposed Actions: ${insight.insight.proposedActions
    .map(
      (action, index) =>
        `${index + 1}. ${action.content} (Value: ${action.value}, Effort: ${
          action.effort
        })`
    )
    .join("\n")}
Links: ${insight.links.join(", ")}
  `.trim();

  return new Document({
    pageContent: content,
    metadata: {
      company: insight.company,
      homepage: insight.homepage,
      title: insight.insight.title,
      impact: insight.impact,
      proposedActions: insight.insight.proposedActions,
      links: insight.links,
      documentType: "insight",
    },
  });
};

// NEW: Convert each proposed action to its own document for better granular search
const createDocumentsFromActions = (insight: AiInsight): Document[] => {
  return insight.insight.proposedActions.map((action, index) => {
    const valueToEffortRatio = action.value / action.effort;

    // Determine quick win category
    let quickWinCategory = "standard";
    if (action.value >= 7 && action.effort <= 4) {
      quickWinCategory = "high-value-quick-win";
    } else if (action.value >= 6 && action.effort <= 3) {
      quickWinCategory = "quick-win";
    } else if (action.value >= 8) {
      quickWinCategory = "high-value";
    } else if (action.effort <= 3) {
      quickWinCategory = "low-effort";
    }

    const content = `
Action: ${action.content}
Company Context: ${insight.company} - ${insight.insight.title}
Insight Summary: ${insight.insight.summary}
Value Score: ${action.value}/10
Effort Score: ${action.effort}/10
Value-to-Effort Ratio: ${valueToEffortRatio.toFixed(2)}
Impact Level: ${insight.impact}
Quick Win Category: ${quickWinCategory}
Competitive Context: This action is based on analysis of ${
      insight.company
    }'s strategy and market positioning.
    `.trim();

    return new Document({
      pageContent: content,
      metadata: {
        company: insight.company,
        homepage: insight.homepage,
        insightTitle: insight.insight.title,
        insightSummary: insight.insight.summary,
        impact: insight.impact,
        actionContent: action.content,
        value: action.value,
        effort: action.effort,
        valueToEffortRatio: valueToEffortRatio,
        quickWinCategory: quickWinCategory,
        actionIndex: index,
        links: insight.links,
        documentType: "action",
      },
    });
  });
};

// Initialize the vector store with both insight-level and action-level documents
export const initializeVectorStore = async (): Promise<FaissStore> => {
  if (vectorStore) {
    return vectorStore;
  }

  console.log("🔄 Initializing vector store with orionData...");

  try {
    // Create embeddings instance
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small", // More cost-effective embedding model
    });

    // Create both insight-level and action-level documents
    const insightDocuments = orion_data.aiInsights.map(
      createDocumentFromInsight
    );
    const actionDocuments = orion_data.aiInsights.flatMap(
      createDocumentsFromActions
    );

    // Combine all documents
    const allDocuments = [...insightDocuments, ...actionDocuments];

    console.log(
      `📄 Created ${insightDocuments.length} insight documents and ${actionDocuments.length} action documents`
    );
    console.log(`📊 Total documents: ${allDocuments.length}`);

    // Create vector store from documents
    vectorStore = await FaissStore.fromDocuments(allDocuments, embeddings);

    console.log("✅ Vector store initialized successfully!");
    return vectorStore;
  } catch (error) {
    console.error("❌ Error initializing vector store:", error);
    throw error;
  }
};

// NEW: Get quick wins - high value, low effort actions
export const getQuickWins = async (
  k: number = 5,
  minValue: number = 6,
  maxEffort: number = 4
): Promise<Document[]> => {
  if (!vectorStore) {
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    // Search for quick win actions
    const results = await vectorStore.similaritySearch(
      "quick win high value low effort action competitive advantage",
      20
    );

    // Filter for action documents that meet quick win criteria
    const quickWins = results
      .filter(
        (doc) =>
          doc.metadata.documentType === "action" &&
          doc.metadata.value >= minValue &&
          doc.metadata.effort <= maxEffort
      )
      .sort(
        (a, b) => b.metadata.valueToEffortRatio - a.metadata.valueToEffortRatio
      )
      .slice(0, k);

    console.log(
      `🚀 Found ${quickWins.length} quick wins (value >= ${minValue}, effort <= ${maxEffort})`
    );
    return quickWins;
  } catch (error) {
    console.error("❌ Error getting quick wins:", error);
    throw error;
  }
};

// NEW: Get high-value actions regardless of effort
export const getHighValueActions = async (
  k: number = 5,
  minValue: number = 7
): Promise<Document[]> => {
  if (!vectorStore) {
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    const results = await vectorStore.similaritySearch(
      "high value action competitive advantage strategic",
      20
    );

    const highValueActions = results
      .filter(
        (doc) =>
          doc.metadata.documentType === "action" &&
          doc.metadata.value >= minValue
      )
      .sort((a, b) => b.metadata.value - a.metadata.value)
      .slice(0, k);

    console.log(
      `💎 Found ${highValueActions.length} high-value actions (value >= ${minValue})`
    );
    return highValueActions;
  } catch (error) {
    console.error("❌ Error getting high-value actions:", error);
    throw error;
  }
};

// NEW: Get actions by value-to-effort ratio
export const getActionsByValueEffortRatio = async (
  k: number = 5,
  minRatio: number = 1.5
): Promise<Document[]> => {
  if (!vectorStore) {
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    const results = await vectorStore.similaritySearch(
      "efficient action high return on investment competitive",
      30
    );

    const efficientActions = results
      .filter(
        (doc) =>
          doc.metadata.documentType === "action" &&
          doc.metadata.valueToEffortRatio >= minRatio
      )
      .sort(
        (a, b) => b.metadata.valueToEffortRatio - a.metadata.valueToEffortRatio
      )
      .slice(0, k);

    console.log(
      `⚡ Found ${efficientActions.length} efficient actions (ratio >= ${minRatio})`
    );
    return efficientActions;
  } catch (error) {
    console.error("❌ Error getting actions by value-effort ratio:", error);
    throw error;
  }
};

// Perform similarity search on the vector store
export const performSimilaritySearch = async (
  query: string,
  k: number = 3
): Promise<Document[]> => {
  if (!vectorStore) {
    console.log("🔄 Vector store not initialized, initializing now...");
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    console.log(`🔍 Performing similarity search for: "${query}"`);
    const results = await vectorStore.similaritySearch(query, k);
    console.log(`📊 Found ${results.length} similar documents`);
    return results;
  } catch (error) {
    console.error("❌ Error performing similarity search:", error);
    throw error;
  }
};

// Perform similarity search with scores
export const performSimilaritySearchWithScore = async (
  query: string,
  k: number = 3
): Promise<[Document, number][]> => {
  if (!vectorStore) {
    console.log("🔄 Vector store not initialized, initializing now...");
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    console.log(`🔍 Performing similarity search with scores for: "${query}"`);
    const results = await vectorStore.similaritySearchWithScore(query, k);
    console.log(`📊 Found ${results.length} similar documents with scores`);
    return results;
  } catch (error) {
    console.error("❌ Error performing similarity search with scores:", error);
    throw error;
  }
};

// Get insights by company name
export const getInsightsByCompany = async (
  companyName: string
): Promise<Document[]> => {
  if (!vectorStore) {
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    // Use similarity search to find company-specific insights
    const results = await vectorStore.similaritySearch(
      `company: ${companyName}`,
      20
    );

    // Filter results to only include exact company matches
    const companyResults = results.filter(
      (doc) => doc.metadata.company.toLowerCase() === companyName.toLowerCase()
    );

    console.log(
      `🏢 Found ${companyResults.length} insights for ${companyName}`
    );
    return companyResults;
  } catch (error) {
    console.error(
      `❌ Error getting insights for company ${companyName}:`,
      error
    );
    throw error;
  }
};

// Get insights by impact level
export const getInsightsByImpact = async (
  impact: "high" | "medium" | "low"
): Promise<Document[]> => {
  if (!vectorStore) {
    await initializeVectorStore();
  }

  if (!vectorStore) {
    throw new Error("Failed to initialize vector store");
  }

  try {
    const results = await vectorStore.similaritySearch(`impact: ${impact}`, 20);

    // Filter results to only include exact impact matches
    const impactResults = results.filter(
      (doc) => doc.metadata.impact === impact
    );

    console.log(`📈 Found ${impactResults.length} ${impact} impact insights`);
    return impactResults;
  } catch (error) {
    console.error(`❌ Error getting ${impact} impact insights:`, error);
    throw error;
  }
};
