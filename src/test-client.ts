#!/usr/bin/env ts-node
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function testChat() {
  // Get arguments from command line
  const args = process.argv.slice(2);

  // Check for mode flag
  let mode = "chat"; // default mode
  let message = "";

  if (args[0] === "--agent" || args[0] === "-a") {
    mode = "agent";
    message = args.slice(1).join(" ");
  } else if (args[0] === "--search" || args[0] === "-s") {
    mode = "search";
    message = args.slice(1).join(" ");
  } else if (args[0] === "--analyze" || args[0] === "--analyse") {
    mode = "analyze";
    message = args.slice(1).join(" ");
  } else if (args[0] === "--chat-agent") {
    mode = "chat-agent"; // Use chat endpoint with explicit agent mode
    message = args.slice(1).join(" ");
  } else if (args[0] === "--chat-regular") {
    mode = "chat-regular"; // Use chat endpoint with explicit regular mode
    message = args.slice(1).join(" ");
  } else {
    message = args.join(" ");
  }

  if (!message) {
    console.log("❌ Please provide a message to send to the chat service");
    console.log("");
    console.log("Usage:");
    console.log(
      '  npm run chat "your message here"           # Smart chat (auto-detects agent need)'
    );
    console.log(
      '  npm run chat --agent "your message here"   # Agent with vector search'
    );
    console.log(
      '  npm run chat --search "your query here"    # Direct search (non-streaming)'
    );
    console.log(
      '  npm run chat --analyze "your message"      # Analyze chat mode recommendation'
    );
    console.log(
      '  npm run chat --chat-agent "message"       # Force chat endpoint to use agent mode'
    );
    console.log(
      '  npm run chat --chat-regular "message"     # Force chat endpoint to use regular mode'
    );
    console.log("");
    console.log("Examples:");
    console.log('  npm run chat "Hello, how are you?"');
    console.log(
      '  npm run chat "What are Zscaler\'s quick wins?"  # Auto-detects agent need'
    );
    console.log('  npm run chat --agent "What does Zscaler focus on?"');
    console.log(
      '  npm run chat --agent "What are the top quick wins I can get done today?"'
    );
    console.log(
      '  npm run chat --agent "What are the highest value actions versus competitors?"'
    );
    console.log('  npm run chat --agent "What gives me the best ROI?"');
    console.log('  npm run chat --search "Digital Guardian compliance"');
    console.log(
      '  npm run chat --analyze "What are quick wins for cybersecurity?"'
    );
    process.exit(1);
  }

  const endpoint =
    mode === "agent"
      ? "/api/agent"
      : mode === "search"
      ? "/api/search"
      : mode === "analyze"
      ? "/api/analyze"
      : mode === "chat-agent" || mode === "chat-regular"
      ? "/api/chat"
      : "/api/chat";

  console.log(`🚀 Testing ${mode} service at ${BASE_URL}`);
  console.log(`💬 Sending message: "${message}"`);

  if (mode === "search") {
    console.log("🔍 Performing direct search (non-streaming):\n");
  } else if (mode === "analyze") {
    console.log("🧠 Analyzing chat mode recommendation:\n");
  } else {
    console.log("📡 Streaming response:\n");
  }

  try {
    // First check if server is running
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error("Server health check failed");
    }

    if (mode === "search") {
      // Handle search mode (non-streaming)
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message,
          searchType: "similarity",
          k: 3,
          includeScores: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const searchResults = await response.json();

      console.log(`📊 Search Results (${searchResults.results.length} found):`);
      console.log(`🔍 Query: "${searchResults.query}"`);
      console.log(`📈 Search Type: ${searchResults.searchType}\n`);

      searchResults.results.forEach((result: any, index: number) => {
        const score = searchResults.scores
          ? ` (Score: ${searchResults.scores[index].toFixed(4)})`
          : "";
        console.log(`--- Result ${index + 1}${score} ---`);
        console.log(`Company: ${result.metadata.company}`);
        console.log(`Title: ${result.metadata.title}`);
        console.log(`Impact: ${result.metadata.impact}`);
        console.log(`Content: ${result.pageContent.substring(0, 200)}...`);
        console.log("");
      });
    } else if (mode === "analyze") {
      // Handle analyze mode (non-streaming)
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const analysis = await response.json();

      console.log(`🧠 Chat Mode Analysis:`);
      console.log(`📝 Message: "${analysis.message}"`);
      console.log(`🎯 Recommended Mode: ${analysis.analysis.mode}`);
      console.log(
        `📊 Confidence: ${(analysis.analysis.confidence * 100).toFixed(1)}%`
      );
      console.log(`💡 Recommendation: ${analysis.recommendation}`);

      if (analysis.analysis.reasons.length > 0) {
        console.log(`\n🔍 Reasons:`);
        analysis.analysis.reasons.forEach((reason: string, index: number) => {
          console.log(`  ${index + 1}. ${reason}`);
        });
      }
      console.log("");
    } else {
      // Handle streaming modes (chat and agent)
      const requestBody: any = {
        message,
        conversationId: `test-cli-${mode}-` + Date.now(),
      };

      // Add mode selection for chat endpoint
      if (mode === "chat-agent") {
        requestBody.mode = "agent";
      } else if (mode === "chat-regular") {
        requestBody.mode = "regular";
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body reader available");
      }

      let fullResponse = "";
      let cardsReceived: any[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        // Check if this chunk contains metadata
        if (chunk.startsWith("data: ") && chunk.includes('"metadata"')) {
          try {
            const dataLine = chunk.replace("data: ", "").trim();
            const parsed = JSON.parse(dataLine);
            if (parsed.metadata && parsed.metadata.cards) {
              cardsReceived.push(...parsed.metadata.cards);
            }
          } catch (e) {
            // Not JSON metadata, continue with regular output
          }
        }

        process.stdout.write(chunk);
        fullResponse += chunk;
      }

      // Display cards if any were received
      if (cardsReceived.length > 0) {
        console.log("\n\n🎴 Cards Generated:");
        cardsReceived.forEach((card, index) => {
          console.log(`\n--- Card ${index + 1}: ${card.type} ---`);
          console.log(`Title: ${card.title}`);
          if (card.items) {
            console.log("Items:");
            card.items.forEach((item: any, i: number) => {
              console.log(`  ${i + 1}. ${item.title || item.text}`);
              if (item.value && item.effort) {
                console.log(
                  `     Value: ${item.value}/10, Effort: ${item.effort}/10`
                );
              }
            });
          }
          if (card.suggestions) {
            console.log("Suggestions:");
            card.suggestions.forEach((suggestion: string, i: number) => {
              console.log(`  ${i + 1}. ${suggestion}`);
            });
          }
        });
      }

      console.log("\n");
    }

    console.log("✅ Test completed successfully!");

    if (mode === "agent") {
      console.log(
        "🤖 Agent used vector search to find relevant orionData insights"
      );
    }
  } catch (error) {
    console.error("\n❌ Error testing service:");

    if (error instanceof Error) {
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        console.error(
          "🔌 Connection refused - make sure the server is running with: npm run dev"
        );
      } else if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        console.error(
          "🔑 Unauthorized - check your OPENAI_API_KEY in .env file"
        );
      } else {
        console.error(`💥 ${error.message}`);
      }
    } else {
      console.error("💥 Unknown error occurred");
    }

    console.error("\n🛠️  Troubleshooting:");
    console.error("1. Make sure the server is running: npm run dev");
    console.error("2. Check your .env file has OPENAI_API_KEY set");
    console.error("3. Verify the server is accessible at", BASE_URL);
    console.error(
      "4. For agent mode, ensure vector store initializes properly"
    );

    process.exit(1);
  }
}

// Run the test
testChat();
