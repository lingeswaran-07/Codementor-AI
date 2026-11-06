import { useEffect, useState } from 'react';
import { authConfig, login, signup, setToken, githubLoginUrl } from './api.js';

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [github, setGithub] = useState(false);
  useEffect(() => { authConfig().then((c) => setGithub(c.github)).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const { token } = await (mode === 'login' ? login(form) : signup(form));
      setToken(token); onAuthed();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="logo">◆ CodeMentor</div>
        <h1>Understand any codebase in minutes.</h1>
        <p>Paste a GitHub link, ask questions in plain English, and get answers that point to the exact files and lines.</p>
        <ul>
          <li>Answers stream in as they are written</li>
          <li>Every answer cites its source files</li>
          <li>Your conversations are saved to your account</li>
        </ul>
      </section>
      <section className="auth-card">
        <div className="tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>Log in</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr(''); }}>Sign up</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'signup' && (<label>Name<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>)}
          <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
          <label>Password<input type="password" value={form.password} onChange={set('password')} minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        {github && (<><div className="or"><span>or</span></div><a className="btn ghost wide" href={githubLoginUrl}>Continue with GitHub</a></>)}
      </section>
    </div>
  );
}
