import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import repoRoutes from "./routes/repos.js";
import chatRoutes from "./routes/chat.js";
import { Repo } from "./models/index.js";
for (const key of ["MONGO_URI", "JWT_SECRET", "GEMINI_API_KEY"]) {
  if (!process.env[key]) console.warn(`⚠️  ${key} is missing in server/.env`);
}
if (!process.env.MONGO_URI) process.exit(1);

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://codementor-ai-1-lwt3.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/chat", chatRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");
  await Repo.updateMany(
    { status: "indexing" },
    {
      status: "failed",
      error:
        "Indexing was interrupted by a server restart. Click Analyze repo to retry.",
    },
  );
} catch (e) {
  console.error("❌ MongoDB connection failed:", e.message);
  console.error(
    "   Check MONGO_URI, the database user password, and Atlas > Network Access.",
  );
  process.exit(1);
}
const port = process.env.PORT || 5000;
app.listen(port, () =>
  console.log(`🚀 API running on http://localhost:${port}`),
);
