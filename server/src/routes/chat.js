import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Repo, Chat } from "../models/index.js";
import { retrieve, buildPrompt } from "../services/rag.js";
import { streamAnswer } from "../services/gemini.js";

const r = Router();
r.use(requireAuth);

const getRepo = (req) =>
  Repo.findOne({ _id: req.params.repoId, user: req.userId });

// Saved history for this user + repo
r.get("/:repoId/history", async (req, res) => {
  const chat = await Chat.findOne({
    user: req.userId,
    repo: req.params.repoId,
  });
  res.json(chat?.messages || []);
});

r.delete("/:repoId/history", async (req, res) => {
  await Chat.deleteOne({ user: req.userId, repo: req.params.repoId });
  res.json({ ok: true });
});

// Ask a question -> SSE stream, then persist the exchange
r.post("/:repoId", async (req, res) => {
  const question = String(req.body.question || "").trim();
  if (!question) return res.status(400).json({ error: "Question is required" });
  const repo = await getRepo(req);
  if (!repo || repo.status !== "ready")
    return res.status(400).json({ error: "Repository is not ready yet" });

  const chat =
    (await Chat.findOne({ user: req.userId, repo: repo.id })) ||
    (await Chat.create({ user: req.userId, repo: repo.id, messages: [] }));
  const history = chat.messages.slice(-6);

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let closed = false,
    answer = "",
    sources = [];
  req.on("close", () => {
    closed = true;
  });

  try {
    const chunks = await retrieve(repo.id, question);
    sources = chunks.map((c) => ({
      path: c.path,
      startLine: c.startLine,
      endLine: c.endLine,
    }));
    send("sources", sources);
    for await (const token of streamAnswer(
      buildPrompt(question, chunks, history),
    )) {
      if (closed) break;
      answer += token;
      send("token", token);
    }
    send("done", {});
  } catch (e) {
    send("error", { message: e.message });
  }

  if (answer) {
    chat.messages.push(
      { role: "user", text: question },
      { role: "ai", text: answer, sources },
    );
    await chat.save();
  }
  res.end();
});

export default r;
