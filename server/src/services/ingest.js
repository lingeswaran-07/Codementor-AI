import { Repo, Chunk, User } from "../models/index.js";
import { chunkFile, isIndexable } from "./chunker.js";
import { embedTexts } from "./gemini.js";
import { ghHeaders } from "./github.js";

async function gh(url, token) {
  const res = await fetch(`https://api.github.com${url}`, {
    headers: ghHeaders(token),
  });
  if (res.status === 404)
    throw new Error(
      "Repository not found. If it is private, add GITHUB_TOKEN to server/.env.",
    );
  if (res.status === 403)
    throw new Error(
      "GitHub rate limit reached. Add GITHUB_TOKEN to server/.env and retry.",
    );
  if (!res.ok) throw new Error(`GitHub error ${res.status}`);
  return res.json();
}

export async function ingestRepo(repoId) {
  const repo = await Repo.findById(repoId);
  try {
    const user = await User.findById(repo.user);
    const token = user?.githubToken || process.env.GITHUB_TOKEN;

    const { default_branch } = await gh(`/repos/${repo.fullName}`, token);
    const tree = await gh(
      `/repos/${repo.fullName}/git/trees/${default_branch}?recursive=1`,
      token,
    );
    const files = tree.tree
      .filter((f) => f.type === "blob" && isIndexable(f.path, f.size || 0))
      .slice(0, 300);
    if (!files.length)
      throw new Error("No readable source files found in this repository.");

    // Download file contents in small parallel batches
    const all = [];
    for (let i = 0; i < files.length; i += 10) {
      const batch = files.slice(i, i + 10);
      const texts = await Promise.all(
        batch.map(async (f) => {
          const res = await fetch(
            `https://raw.githubusercontent.com/${repo.fullName}/${default_branch}/${f.path.split("/").map(encodeURIComponent).join("/")}`,
            { headers: ghHeaders(token) },
          );
          return res.ok ? res.text() : null;
        }),
      );
      batch.forEach((f, j) => {
        if (texts[j]) all.push(...chunkFile(f.path, texts[j]));
      });
    }
    if (!all.length) throw new Error("Could not read any file contents.");
    const MAX = Number(process.env.MAX_CHUNKS || 400); // keeps free-tier indexing fast
    if (all.length > MAX) all.length = MAX;

    const embeddings = await embedTexts(
      all.map((c) => `File: ${c.path}\n${c.text}`),
    );
    await Chunk.deleteMany({ repo: repo.id });
    await Chunk.insertMany(
      all.map((c, i) => ({ ...c, repo: repo.id, embedding: embeddings[i] })),
    );

    Object.assign(repo, {
      status: "ready",
      filesIndexed: files.length,
      chunkCount: all.length,
      error: undefined,
    });
  } catch (e) {
    Object.assign(repo, { status: "failed", error: e.message });
  }
  await repo.save();
}
