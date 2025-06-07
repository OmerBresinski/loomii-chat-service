// Card type definitions for frontend components

export interface BaseCard {
  type: string;
  title: string;
}

export interface ActionListCard extends BaseCard {
  type: "action-list";
  items: Array<{
    title: string;
    description?: string;
  }>;
}

export interface QuickWinsCard extends BaseCard {
  type: "quick-wins";
  items: Array<{
    title: string;
    description?: string;
    value?: number;
    effort?: number;
    ratio?: number;
  }>;
}

export interface HighValueActionsCard extends BaseCard {
  type: "high-value-actions";
  items: Array<{
    title: string;
    description?: string;
    value?: number;
    effort?: number;
    ratio?: number;
  }>;
}

export interface CompetitiveAnalysisCard extends BaseCard {
  type: "competitive-analysis";
  items: Array<{
    title: string;
    description?: string;
    competitor?: string;
    advantage?: string;
  }>;
}

export interface AssistanceSuggestionsCard extends BaseCard {
  type: "assistance-suggestions";
  suggestions: string[];
}

export type ChatCard =
  | ActionListCard
  | QuickWinsCard
  | HighValueActionsCard
  | CompetitiveAnalysisCard
  | AssistanceSuggestionsCard;

export interface ChatMetadata {
  timestamp: string;
  cards: ChatCard[];
}

// Helper function to parse metadata from stream
export const parseStreamMetadata = (
  chunk: string
): { content: string; metadata?: ChatMetadata } => {
  const metadataMatch = chunk.match(/__METADATA__(.*?)__END_METADATA__/s);

  if (metadataMatch) {
    try {
      const metadata = JSON.parse(metadataMatch[1]) as ChatMetadata;
      const content = chunk.replace(/__METADATA__.*?__END_METADATA__/s, "");
      return { content, metadata };
    } catch (error) {
      console.error("Failed to parse metadata:", error);
      return { content: chunk };
    }
  }

  return { content: chunk };
};
