#!/usr/bin/env ts-node
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function testChat() {
  // Get message from command line arguments
  const args = process.argv.slice(2);
  const message = args.join(" ");

  if (!message) {
    console.log("❌ Please provide a message to send to the chat service");
    console.log('Usage: npm run chat "your message here"');
    console.log('Example: npm run chat "Hello, how are you?"');
    process.exit(1);
  }

  console.log(`🚀 Testing chat service at ${BASE_URL}`);
  console.log(`💬 Sending message: "${message}"`);
  console.log("📡 Streaming response:\n");

  try {
    // First check if server is running
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error("Server health check failed");
    }

    // Send chat request
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversationId: "test-cli",
      }),
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

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    console.log("\n\n✅ Chat completed successfully!");
    console.log(`📝 Full response length: ${fullResponse.length} characters`);
  } catch (error) {
    console.error("\n❌ Error testing chat service:");

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

    process.exit(1);
  }
}

// Run the test
testChat();
