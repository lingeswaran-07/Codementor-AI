import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Repo, Chunk, Chat } from '../models/index.js';
import { ingestRepo } from '../services/ingest.js';
import { parseRepoInput } from '../services/github.js';

const r = Router();
r.use(requireAuth);

r.get('/', async (req, res) => {
  res.json(await Repo.find({ user: req.userId }).sort('-updatedAt'));
});

// Paste a GitHub link (or owner/repo) -> index it
r.post('/', async (req, res) => {
  const fullName = parseRepoInput(req.body.url ?? req.body.fullName);
  if (!fullName) return res.status(400).json({ error: 'Paste a GitHub link like https://github.com/owner/repo' });

  let repo = await Repo.findOne({ user: req.userId, fullName: new RegExp(`^${fullName}$`, 'i') });
  if (repo?.status === 'indexing') return res.status(202).json(repo);
  if (repo) { repo.status = 'indexing'; repo.error = undefined; await repo.save(); } // re-index
  else repo = await Repo.create({ user: req.userId, fullName });

  ingestRepo(repo.id); // runs in background; client polls status
  res.status(202).json(repo);
});

r.get('/:id', async (req, res) => {
  const repo = await Repo.findOne({ _id: req.params.id, user: req.userId });
  if (!repo) return res.status(404).json({ error: 'Not found' });
  res.json(repo);
});

r.delete('/:id', async (req, res) => {
  const repo = await Repo.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (repo) await Promise.all([Chunk.deleteMany({ repo: repo.id }), Chat.deleteMany({ repo: repo.id })]);
  res.json({ ok: true });
});

export default r;
