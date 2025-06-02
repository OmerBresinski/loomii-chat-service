# Loomii Chat Service

A TypeScript Express server that provides streaming AI chat completions using LangGraph and OpenAI's GPT-4o Mini.

## Features

- 🚀 Express.js server with TypeScript
- 💬 Streaming chat completions using ReadableStream
- 🧠 LangGraph integration for AI workflow management
- 🔄 Conversation history management
- 🌐 CORS enabled for cross-origin requests
- 📡 Health check endpoint
- 🧪 Built-in CLI testing tool

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   Or start the production server:
   ```bash
   npm start
   ```

## Testing

### Quick CLI Test
Once your server is running, you can test it directly from the command line:

```bash
npm run chat "Hello, how are you?"
```

```bash
npm run chat "Tell me a joke about programming"
```

```bash
npm run chat "What is the meaning of life?"
```

The CLI test tool will:
- ✅ Check if the server is running
- 📤 Send your message to the chat endpoint
- 📥 Stream the AI response in real-time
- 🔍 Provide helpful error messages and troubleshooting tips

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Chat Completion (Streaming)
```
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "conversationId": "optional-conversation-id"
}
```

Returns a streaming text response. The response is streamed as plain text chunks.

### Get Conversation History
```
GET /api/chat/:conversationId
```

Returns the conversation history for a given conversation ID.

## Usage Examples

### CLI Testing (Recommended for quick tests):
```bash
# Start the server in one terminal
npm run dev

# Test in another terminal
npm run chat "What's the weather like?"
```

### Using curl for streaming chat:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a joke", "conversationId": "test-123"}' \
  --no-buffer
```

### Using JavaScript fetch:
```javascript
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello, how are you?',
    conversationId: 'my-conversation'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk); // Process each chunk of the response
}
```

## Project Structure

```
src/
├── index.ts              # Main server file
├── routes/
│   └── chat.ts          # Chat API routes
├── services/
│   └── chatService.ts   # LangGraph + OpenAI integration (functional)
└── test-client.ts       # CLI testing tool
```

## Technologies Used

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **LangGraph** - AI workflow orchestration
- **LangChain** - AI application framework
- **OpenAI** - GPT-4o Mini for chat completions
- **Node.js Streams** - For streaming responses

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run chat "message"` - Test the chat service from CLI

## Troubleshooting

### Common Issues:

1. **Connection refused error:**
   - Make sure the server is running with `npm run dev`

2. **Unauthorized/401 errors:**
   - Check that your `OPENAI_API_KEY` is set in the `.env` file

3. **Empty responses:**
   - Verify your OpenAI API key has sufficient credits
   - Check the server logs for detailed error messages

4. **TypeScript compilation errors:**
   - Run `npm install` to ensure all dependencies are installed
   - Check that your Node.js version is 18 or higher

## License

ISC 