const fetch = require("node-fetch");

async function testStreaming() {
  console.log("🧪 Testing streaming behavior...\n");

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message:
          "Tell me a detailed story about cybersecurity threats and how companies protect themselves",
        conversationId: "streaming-test-" + Date.now(),
        mode: "regular", // Force regular mode to avoid agent complexity
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("📡 Starting to receive stream...\n");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let chunkCount = 0;
    let totalLength = 0;
    let lastChunkTime = Date.now();
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      chunkCount++;
      totalLength += chunk.length;

      const now = Date.now();
      const elapsed = now - startTime;
      const timeSinceLastChunk = now - lastChunkTime;
      lastChunkTime = now;

      // Show chunk info with timing
      console.log(
        `📦 Chunk ${chunkCount} (${
          chunk.length
        } chars, +${timeSinceLastChunk}ms, total: ${elapsed}ms): "${chunk.substring(
          0,
          30
        )}${chunk.length > 30 ? "..." : ""}"`
      );

      // Don't add artificial delay here - we want to see natural streaming
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n✅ Streaming complete!`);
    console.log(`📊 Total chunks: ${chunkCount}`);
    console.log(`📏 Total length: ${totalLength} characters`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(
      `🚀 Average chunk size: ${(totalLength / chunkCount).toFixed(1)} chars`
    );
    console.log(
      `⚡ Average time between chunks: ${(totalTime / chunkCount).toFixed(1)}ms`
    );

    if (chunkCount === 1) {
      console.log(
        "\n⚠️  WARNING: Only received 1 chunk - streaming may not be working properly!"
      );
      console.log("Expected: Multiple small chunks arriving over time");
      console.log("Actual: One large chunk with all data");
    } else {
      console.log(
        `\n✅ Streaming appears to be working! Received ${chunkCount} chunks`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("ECONNREFUSED")) {
      console.log("\n💡 Make sure the server is running with: npm run dev");
    }
  }
}

testStreaming();
