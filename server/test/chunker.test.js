import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkFile, isIndexable } from '../src/services/chunker.js';
import { cosine } from '../src/services/rag.js';
import { parseRepoInput } from '../src/services/github.js';

test('chunkFile creates overlapping chunks with line ranges', () => {
  const content = Array.from({ length: 130 }, (_, i) => `line ${i + 1}`).join('\n');
  const chunks = chunkFile('a.js', content);
  assert.equal(chunks[0].startLine, 1);
  assert.equal(chunks[0].endLine, 60);
  assert.equal(chunks[1].startLine, 51);
  assert.equal(chunks.at(-1).endLine, 130);
});

test('isIndexable filters junk', () => {
  assert.ok(isIndexable('src/app.js', 500));
  assert.ok(!isIndexable('node_modules/x/index.js', 500));
  assert.ok(!isIndexable('package-lock.json', 500));
  assert.ok(!isIndexable('logo.png', 500));
});

test('cosine similarity', () => {
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9);
  assert.ok(Math.abs(cosine([1, 0], [0, 1])) < 1e-9);
});

test('parseRepoInput accepts links and owner/repo', () => {
  assert.equal(parseRepoInput('https://github.com/lingeswaran-07/Foody'), 'lingeswaran-07/Foody');
  assert.equal(parseRepoInput('https://github.com/lingeswaran-07/Foody.git'), 'lingeswaran-07/Foody');
  assert.equal(parseRepoInput('https://github.com/a/b/tree/main/src'), 'a/b');
  assert.equal(parseRepoInput('github.com/a/b/'), 'a/b');
  assert.equal(parseRepoInput('owner/repo'), 'owner/repo');
  assert.equal(parseRepoInput('https://example.com/a/b'), null);
  assert.equal(parseRepoInput('hello'), null);
});
