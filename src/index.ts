import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat";
import { initializeVectorStore } from "./services/vectorStore";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", chatRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Initialize vector store and start server
const startServer = async () => {
  try {
    console.log("🔄 Initializing vector store...");
    await initializeVectorStore();
    console.log("✅ Vector store initialized successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Chat service running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
      console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search`);
      console.log(
        `💡 Assistant suggestions: http://localhost:${PORT}/api/assistant-suggestions`
      );
    });
  } catch (error) {
    console.error("❌ Failed to initialize vector store:", error);
    process.exit(1);
  }
};

startServer();
