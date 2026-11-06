import { Chunk } from '../models/index.js';
import { embedQuery } from './gemini.js';

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function retrieve(repoId, question, k = 6) {
  const qv = await embedQuery(question);
  const chunks = await Chunk.find({ repo: repoId }).lean();
  return chunks
    .map((c) => ({ ...c, score: cosine(qv, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function buildPrompt(question, chunks, history = []) {
  const context = chunks
    .map((c) => `--- ${c.path}:${c.startLine}-${c.endLine} ---\n${c.text}`)
    .join('\n\n');
  const convo = history.length
    ? `\nEARLIER IN THIS CONVERSATION:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')}\n`
    : '';
  return `You are CodeMentor, an assistant that helps developers understand an unfamiliar codebase.
Answer ONLY using the code context below. Cite files inline like (path:startLine-endLine).
Use short paragraphs and fenced code blocks where helpful. If the context is insufficient, say so instead of guessing.
${convo}
CODE CONTEXT:
${context}

QUESTION: ${question}`;
}
