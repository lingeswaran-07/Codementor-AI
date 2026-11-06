import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const r = Router();
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar });

r.get('/config', (_req, res) => res.json({ github: !!process.env.GITHUB_CLIENT_ID }));

// ---- Email + password ----
r.post('/signup', async (req, res, next) => {
  try {
    const { name = '', email = '', password = '' } = req.body;
    if (!name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const user = await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) { next(e); }
});

r.post('/login', async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password' });
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (e) { next(e); }
});

r.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Please log in again' });
  res.json(publicUser(user));
});

// ---- GitHub OAuth (optional) ----
r.get('/github', (_req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) return res.status(404).send('GitHub login is not configured');
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.SERVER_URL}/auth/github/callback`,
    scope: 'read:user repo',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

r.get('/github/callback', async (req, res, next) => {
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: req.query.code,
      }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(400).send('GitHub login failed');
    const gh = await (await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'codementor-ai' },
    })).json();
    const user = await User.findOneAndUpdate(
      { githubId: String(gh.id) },
      { name: gh.name || gh.login, avatar: gh.avatar_url, githubToken: access_token },
      { upsert: true, new: true }
    );
    res.redirect(`${process.env.CLIENT_URL}/#token=${signToken(user.id)}`);
  } catch (e) { next(e); }
});

export default r;
