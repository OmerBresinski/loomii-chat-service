# Loomii Chat Service

A TypeScript Express chat service with OpenAI integration and vector store capabilities for cybersecurity market intelligence.

## Features

- **Smart Chat**: Automatically detects when to use agent capabilities based on message content
- **Agent Mode**: Vector search-powered responses using cybersecurity market intelligence data
- **Regular Chat**: Standard conversational AI responses
- **Direct Search**: Query the vector store directly for specific information
- **Mode Analysis**: Analyze messages to recommend the best chat mode
- **Streaming Responses**: Real-time response streaming for all chat modes
- **Conversation History**: Persistent conversation tracking

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

3. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

4. **Development mode:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Chat Endpoints

#### Smart Chat (Auto-Detection)
```bash
POST /api/chat
{
  "message": "What cybersecurity trends should I know about?",
  "conversationId": "optional-id",
  "mode": "auto" // optional: "auto", "agent", "regular"
}
```

#### Agent Chat (Vector Search)
```bash
POST /api/agent
{
  "message": "What does Digital Guardian focus on?",
  "conversationId": "optional-id"
}
```

#### Direct Search
```bash
POST /api/search
{
  "query": "cybersecurity trends",
  "searchType": "similarity", // "similarity", "quickWins", "highValue"
  "k": 5,
  "includeScores": true,
  "minValue": 7 // for highValue search
}
```

#### Mode Analysis
```bash
POST /api/analyze
{
  "message": "What are the latest cybersecurity threats?"
}
```

#### Conversation History
```bash
GET /api/chat/:conversationId    # Regular chat history
GET /api/agent/:conversationId   # Agent chat history
```

## Testing with CLI

The project includes a comprehensive test client for easy testing:

### Basic Usage
```bash
# Smart chat (auto-detects agent need)
npm run chat "What cybersecurity trends should I know about?"

# Agent mode with vector search
npm run chat --agent "What does Digital Guardian focus on?"

# Direct search (non-streaming)
npm run chat --search "cybersecurity market intelligence"

# Analyze chat mode recommendation
npm run chat --analyze "What are quick wins for cybersecurity?"

# Force chat endpoint to use agent mode
npm run chat --chat-agent "Tell me about cybersecurity companies"

# Force chat endpoint to use regular mode
npm run chat --chat-regular "Hello, how are you?"
```

### Examples

**Smart Chat (Auto-Detection):**
```bash
npm run chat "What are the top cybersecurity quick wins?"
# Automatically uses agent mode due to keywords
```

**Agent Mode:**
```bash
npm run chat --agent "What does CrowdStrike specialize in?"
# Uses vector search for cybersecurity intelligence
```

**Direct Search:**
```bash
npm run chat --search "threat intelligence"
# Returns structured search results
```

**Mode Analysis:**
```bash
npm run chat --analyze "What are the best ROI security actions?"
# Analyzes and recommends agent mode
```

## cURL Examples

### Smart Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What cybersecurity trends should I know about?"}' \
  --no-buffer
```

### Agent Chat with Vector Search
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "What does Digital Guardian focus on?"}' \
  --no-buffer
```

### Quick Wins Search
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"searchType": "quickWins", "k": 5}'
```

### High Value Actions Search
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"searchType": "highValue", "k": 5, "minValue": 7}'
```

### Mode Analysis
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the best cybersecurity investments?"}'
```

## JavaScript Fetch Example

```javascript
// Smart chat with streaming
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What are the top cybersecurity quick wins?',
    conversationId: 'my-conversation-123',
    mode: 'auto' // Let the system decide
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk);
}
```

## Vector Store Capabilities

The service includes a sophisticated vector store with cybersecurity market intelligence:

- **Company Insights**: Information about cybersecurity companies and their focus areas
- **Action-Level Intelligence**: Specific security actions with value/effort scores
- **Quick Wins Detection**: Automatically identifies high-impact, low-effort actions
- **High-Value Actions**: Finds actions with the highest business value
- **Smart Query Analysis**: Detects user intent and routes to appropriate search methods

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Test the service
npm run chat "Hello world"
```

## Architecture

- **Express.js**: Web framework
- **TypeScript**: Type safety and better development experience
- **OpenAI**: LLM integration for chat responses
- **LangChain**: Vector store and document processing
- **FAISS**: Vector similarity search
- **Server-Sent Events**: Real-time streaming responses

## Error Handling

The service includes comprehensive error handling:
- Connection timeouts
- Invalid API keys
- Malformed requests
- Vector store initialization errors
- Streaming interruptions