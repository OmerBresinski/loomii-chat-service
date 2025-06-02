import { Readable } from "stream";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { InMemoryStore } from "@langchain/core/stores";

// Global conversation histories storage
const conversationHistories = new Map<string, BaseMessage[]>();

// Initialize OpenAI ChatGPT 4o mini
const createLLM = (): ChatOpenAI => {
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
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

// Stream chat completion using direct LLM streaming
// LangGraph integration can be added here for more complex workflows
export const streamChatCompletion = async (
  message: string,
  conversationId?: string
): Promise<Readable> => {
  const stream = new Readable({
    read() {
      // Required for Readable stream
    },
  });

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
        fullResponse += content;
        stream.push(content);
      }
    }

    // Add AI response to history
    const aiMessage = new AIMessage(fullResponse);
    history.push(aiMessage);

    // Update conversation history
    if (conversationId) {
      conversationHistories.set(conversationId, history);
    }

    // End the stream
    stream.push(null);
  } catch (error) {
    console.error("Error in streamChatCompletion:", error);
    stream.emit("error", error);
  }

  return stream;
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
