import { useCallback, useEffect, useState } from 'react';
import { getToken, setToken, logout, me, listRepos, addRepo, deleteRepo } from './api.js';
import Auth from './Auth.jsx';
import Chat from './Chat.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken() || /token=/.test(location.hash));
  const [repos, setRepos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);

  const loadUser = useCallback(async () => {
    const m = /token=([^&]+)/.exec(location.hash);   // GitHub login redirect
    if (m) { setToken(m[1]); history.replaceState(null, '', location.pathname); }
    if (!getToken()) return setChecking(false);
    try { setUser(await me()); } catch { /* logout handled in api */ }
    setChecking(false);
  }, []);
  useEffect(() => { loadUser(); }, [loadUser]);

  const refresh = useCallback(async () => setRepos(await listRepos()), []);
  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  useEffect(() => {  // poll while something is indexing
    if (!repos.some((r) => r.status === 'indexing')) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [repos, refresh]);

  async function add(e) {
    e.preventDefault(); setErr(''); setAdding(true);
    try { const r = await addRepo(url); setUrl(''); await refresh(); setSelectedId(r._id); }
    catch (e) { setErr(e.message); }
    setAdding(false);
  }
  async function remove(e, r) {
    e.stopPropagation();
    if (!confirm(`Remove ${r.fullName} and its chat history?`)) return;
    await deleteRepo(r._id);
    if (selectedId === r._id) setSelectedId(null);
    refresh();
  }

  if (checking) return <div className="splash">Loading…</div>;
  if (!user) return <Auth onAuthed={() => { setChecking(true); loadUser(); }} />;

  const selected = repos.find((r) => r._id === selectedId);
  return (
    <div className="shell">
      <aside className={menu ? 'open' : ''}>
        <div className="brand">◆ CodeMentor</div>
        <form className="add" onSubmit={add}>
          <label htmlFor="repo-url">Add a repository</label>
          <input id="repo-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" required />
          <button className="btn primary" disabled={adding}>{adding ? 'Adding…' : 'Analyze repo'}</button>
          {err && <p className="err">{err}</p>}
        </form>
        <div className="side-title">Your repositories</div>
        <ul className="repos">
          {repos.length === 0 && <li className="hint">Nothing here yet. Paste a GitHub link above to get started.</li>}
          {repos.map((r) => (
            <li key={r._id} className={r._id === selectedId ? 'active' : ''} onClick={() => { setSelectedId(r._id); setMenu(false); }}>
              <div className="repo-main">
                <b>{r.fullName}</b>
                <span className={`badge ${r.status}`}>
                  {r.status === 'ready' ? `${r.filesIndexed} files · ${r.chunkCount} chunks` : r.status === 'indexing' ? 'Indexing…' : 'Failed'}
                </span>
                {r.status === 'failed' && <small className="err">{r.error}</small>}
              </div>
              <button className="x" title="Remove" aria-label={`Remove ${r.fullName}`} onClick={(e) => remove(e, r)}>✕</button>
            </li>
          ))}
        </ul>
        <div className="me">
          <div className="avatar">{(user.name || '?')[0].toUpperCase()}</div>
          <div className="who"><b>{user.name}</b><small>{user.email || 'GitHub account'}</small></div>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Toggle sidebar">☰</button>
        {selected?.status === 'ready' ? <Chat key={selected._id} repo={selected} />
          : selected?.status === 'indexing' ? <div className="empty"><div className="spinner" /><h2>Reading {selected.fullName}…</h2><p>Splitting files into chunks and creating embeddings. This usually takes under a minute.</p></div>
          : <div className="empty"><h2>Ask your codebase anything</h2><p>Paste a GitHub link in the sidebar, then pick a repository to start chatting. Your conversations are saved automatically.</p></div>}
      </main>
    </div>
  );
}
