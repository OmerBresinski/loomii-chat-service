import { BaseMessage } from "@langchain/core/messages";

// Global conversation histories storage - shared across all services
const globalConversationHistories = new Map<string, BaseMessage[]>();

// Get or create conversation history
export const getOrCreateConversationHistory = (
  conversationId?: string
): BaseMessage[] => {
  if (!conversationId) {
    return [];
  }

  if (!globalConversationHistories.has(conversationId)) {
    globalConversationHistories.set(conversationId, []);
  }

  return globalConversationHistories.get(conversationId)!;
};

// Update conversation history
export const updateConversationHistory = (
  conversationId: string,
  history: BaseMessage[]
): void => {
  globalConversationHistories.set(conversationId, history);
};

// Get conversation history
export const getConversationHistory = async (
  conversationId: string
): Promise<BaseMessage[]> => {
  return globalConversationHistories.get(conversationId) || [];
};

// Clear conversation history
export const clearConversationHistory = async (
  conversationId: string
): Promise<void> => {
  globalConversationHistories.delete(conversationId);
};

// Get all conversation IDs
export const getAllConversationIds = (): string[] => {
  return Array.from(globalConversationHistories.keys());
};

// Get conversation count
export const getConversationCount = (): number => {
  return globalConversationHistories.size;
};
