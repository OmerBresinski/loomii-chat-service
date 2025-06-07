# Intelligent Card System

## Overview

The chat service now uses an intelligent LLM-based system to automatically generate interactive cards based on the conversation context. Instead of hardcoded keyword matching, the AI analyzes the user's request and the assistant's response to determine when and what type of cards would be helpful.

## How It Works

1. **User sends a message** (e.g., "What should I do to compete with Zscaler?")
2. **AI provides a text response** with detailed analysis
3. **LLM analyzes the conversation** to determine if cards would be helpful
4. **Cards are generated** using specialized tools and sent as metadata
5. **Frontend receives** both text content and structured card data

## Card Types

### 1. Action List (`action-list`)
- General recommendations and steps
- Used when users ask for advice or next steps

### 2. Quick Wins (`quick-wins`)
- Immediate actions with value/effort scores
- Used when users ask for things to do today/this week

### 3. Competitive Analysis (`competitive-analysis`)
- Competitor insights and strategic responses
- Used when users ask about competitors or market positioning

### 4. Assistance Suggestions (`assistance-suggestions`)
- Follow-up questions and exploration options
- Always provided to continue the conversation

## Frontend Integration

```typescript
import { parseStreamMetadata, ChatCard } from './types/cards';

// When reading the stream:
const { content, metadata } = parseStreamMetadata(chunk);

// Display text content normally
if (content) {
  displayMessage(content);
}

// Render cards when metadata is received
if (metadata?.cards) {
  metadata.cards.forEach(card => {
    switch(card.type) {
      case 'quick-wins':
        return <QuickWinsCard card={card} />;
      case 'competitive-analysis':
        return <CompetitiveAnalysisCard card={card} />;
      case 'assistance-suggestions':
        return <AssistanceSuggestionsCard card={card} />;
      default:
        return <ActionListCard card={card} />;
    }
  });
}
```

## Example Conversations

### User: "Give me 3 things I can do today to improve our security posture"
**Cards Generated:**
- Quick Wins card with 3 actionable items
- Assistance Suggestions for follow-up

### User: "How should we respond to Zscaler's new product launch?"
**Cards Generated:**
- Competitive Analysis card with strategic responses
- Action List with specific countermeasures
- Assistance Suggestions for deeper analysis

### User: "What's the weather like?"
**Cards Generated:**
- Only Assistance Suggestions (no action cards needed)

## Benefits

1. **Intelligent Detection**: AI decides when cards are actually helpful
2. **Context Aware**: Cards are tailored to the specific conversation
3. **Flexible**: Works for any type of request, not just predefined keywords
4. **Consistent**: Same system works for both regular chat and agent responses
5. **Extensible**: Easy to add new card types as needed 