const SKIP_DIRS = /(^|\/)(node_modules|dist|build|\.git|vendor|coverage|__pycache__)\//;
const EXT = /\.(js|jsx|ts|tsx|py|java|go|rs|rb|php|c|cpp|h|cs|kt|swift|sql|sh|json|ya?ml|toml|md|html|css|scss)$/i;
const SKIP_FILES = /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(js|css))$/;

export function isIndexable(path, size) {
  return EXT.test(path) && !SKIP_DIRS.test(path) && !SKIP_FILES.test(path) && size < 100_000;
}

/** Split file text into overlapping line-based chunks. */
export function chunkFile(path, content, size = 60, overlap = 10) {
  const lines = content.split('\n');
  const chunks = [];
  for (let i = 0; i < lines.length; i += size - overlap) {
    const slice = lines.slice(i, i + size);
    const text = slice.join('\n').trim();
    if (text) chunks.push({ path, startLine: i + 1, endLine: i + slice.length, text });
    if (i + size >= lines.length) break;
  }
  return chunks;
}
