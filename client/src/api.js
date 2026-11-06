const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => localStorage.setItem('token', t);
export const logout = () => { localStorage.removeItem('token'); location.reload(); };
export const githubLoginUrl = `${API}/auth/github`;

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

async function request(path, { method = 'GET', body, public: isPublic = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: isPublic ? { 'Content-Type': 'application/json' } : headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !isPublic) { logout(); throw new Error('Session expired'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const authConfig = () => request('/auth/config', { public: true });
export const signup = (b) => request('/auth/signup', { method: 'POST', body: b, public: true });
export const login = (b) => request('/auth/login', { method: 'POST', body: b, public: true });
export const me = () => request('/auth/me');

export const listRepos = () => request('/api/repos');
export const addRepo = (url) => request('/api/repos', { method: 'POST', body: { url } });
export const deleteRepo = (id) => request(`/api/repos/${id}`, { method: 'DELETE' });
export const getHistory = (id) => request(`/api/chat/${id}/history`);
export const clearHistory = (id) => request(`/api/chat/${id}/history`, { method: 'DELETE' });

/** POST + read the SSE stream with fetch (EventSource cannot send an auth header). */
export async function streamChat(repoId, question, { onSources, onToken, onError }) {
  const res = await fetch(`${API}/api/chat/${repoId}`, { method: 'POST', headers: headers(), body: JSON.stringify({ question }) });
  if (!res.ok) return onError((await res.json().catch(() => ({}))).error || 'Request failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split('\n\n');
    buf = events.pop();
    for (const ev of events) {
      const event = /event: (.*)/.exec(ev)?.[1];
      const data = JSON.parse(/data: (.*)/s.exec(ev)?.[1] || 'null');
      if (event === 'sources') onSources(data);
      else if (event === 'token') onToken(data);
      else if (event === 'error') onError(data.message);
    }
  }
}
