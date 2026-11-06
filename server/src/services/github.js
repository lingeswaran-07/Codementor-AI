/** Accepts "owner/repo" or any github.com URL; returns "owner/repo" or null. */
export function parseRepoInput(input) {
  let s = String(input || '').trim().replace(/\/+$/, '').replace(/\.git$/, '');
  if (/^https?:\/\//i.test(s) && !/^https?:\/\/(www\.)?github\.com\//i.test(s)) return null;
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  const m = s.match(/^([\w.-]+)\/([\w.-]+)(?:\/.*)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export const ghHeaders = (token) => ({
  'User-Agent': 'codementor-ai',
  Accept: 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});
