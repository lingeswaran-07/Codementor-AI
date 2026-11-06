import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI;
const client = () =>
  (genAI ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY));
const embedder = () =>
  client().getGenerativeModel({
    model: process.env.EMBED_MODEL || "gemini-embedding-001",
  });
const part = (t) => ({ role: "user", parts: [{ text: t }] });

// ---- Free-tier friendly embedding: small batches, paced under the tokens-per-minute limit, auto-retry on 429 ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const estTokens = (t) => Math.ceil(t.length / 3); // rough, errs on the high side
const BUDGET = Number(process.env.EMBED_TOKENS_PER_MIN || 25000); // free tier limit is 30,000
const used = []; // { t: timestamp, n: tokens }

async function throttle(n) {
  for (;;) {
    const now = Date.now();
    while (used.length && now - used[0].t > 60_000) used.shift();
    const sum = used.reduce((a, b) => a + b.n, 0);
    if (!used.length || sum + n <= BUDGET) {
      used.push({ t: now, n });
      return;
    }
    await sleep(Math.max(500, 60_000 - (now - used[0].t) + 200));
  }
}

async function withRetry(fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!/\[429 /.test(e.message) || attempt >= 6) throw e;
      const m = /retry in ([\d.]+)s/i.exec(e.message);
      await sleep(((m ? parseFloat(m[1]) : 30) + 2) * 1000);
    }
  }
}

export async function embedTexts(texts) {
  texts = texts.map((t) => t.slice(0, 6000));
  const out = [];
  let i = 0;
  while (i < texts.length) {
    let n = 0,
      j = i;
    while (
      j < texts.length &&
      j - i < 50 &&
      (j === i || n + estTokens(texts[j]) <= 8000)
    )
      n += estTokens(texts[j++]);
    const batch = texts.slice(i, j);
    await throttle(n);
    const res = await withRetry(() =>
      embedder().batchEmbedContents({
        requests: batch.map((t) => ({
          content: part(t),
          taskType: "RETRIEVAL_DOCUMENT",
        })),
      }),
    );
    out.push(...res.embeddings.map((e) => e.values));
    i = j;
  }
  return out;
}

export async function embedQuery(q) {
  const res = await withRetry(() =>
    embedder().embedContent({ content: part(q), taskType: "RETRIEVAL_QUERY" }),
  );
  return res.embedding.values;
}

export async function* streamAnswer(prompt) {
  const models = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash",
  ];
  let lastErr;
  for (const name of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let started = false;
      try {
        const model = client().getGenerativeModel({ model: name });
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          started = true;
          yield chunk.text();
        }
        return;
      } catch (e) {
        lastErr = e;
        if (started) throw e; // never retry in the middle of an answer
        if (!/\[(503|429) /.test(e.message)) break; // other errors (e.g. 404): go to the next model
        await sleep(1500 * (attempt + 1)); // overloaded: wait 1.5s, 3s, 4.5s and retry
      }
    }
  }
  throw lastErr;
}
