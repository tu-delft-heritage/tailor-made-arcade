import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { cacheSchemas, fetchIiif } from './fetch-iiif.ts';

const exec = promisify(execFile);

async function put(root: string, path: string, value: unknown) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value));
}

test('fetches a sparse source, preserves duplicate schema names, and refreshes the cache', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'iiif-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const repository = join(temporary, 'upstream');
  const cache = join(temporary, 'cache');
  await mkdir(repository);
  const git = (args: string[]) => exec('git', args, { cwd: repository });
  const commit = async () => {
    await git(['add', '.']);
    await git(['-c', 'user.name=Test', '-c', 'user.email=test@example.com',
      '-c', 'commit.gpgsign=false', 'commit', '-m', 'Fixture']);
  };
  await git(['init', '-b', 'main']);
  await put(repository, 'build/iiif/objects/a/schema.json', { name: 'a' });
  await put(repository, 'build/iiif/objects/b/schema.json', { name: 'b' });
  await put(repository, 'build/iiif/objects/a.json', { type: 'Manifest' });
  await put(repository, 'outside.json', { excluded: true });
  await commit();

  const first = await fetchIiif({ cache, repository });
  assert.equal(first.updated, 2);
  assert.deepEqual(first.files.map(file => file.path), ['objects/a/schema.json', 'objects/b/schema.json']);
  await stat(join(cache, 'source/build/iiif/objects/a.json'));
  await assert.rejects(stat(join(cache, 'source/outside.json')), { code: 'ENOENT' });
  const schema = join(cache, 'schemas/objects/a/schema.json');
  const modified = (await stat(schema)).mtimeMs;
  const second = await fetchIiif({ cache, repository });
  assert.equal(second.updated, 0);
  assert.equal(second.unchanged, 2);
  assert.equal((await stat(schema)).mtimeMs, modified);

  await put(repository, 'build/iiif/objects/a/schema.json', { name: 'changed' });
  await rm(join(repository, 'build/iiif/objects/b'), { recursive: true });
  await put(repository, 'build/iiif/objects/c/schema.json', { name: 'c' });
  await commit();
  const third = await fetchIiif({ cache, repository });
  assert.equal(third.updated, 2);
  assert.equal(third.removed, 1);
  assert.notEqual(third.commit, first.commit);
  assert.deepEqual(JSON.parse(await readFile(schema, 'utf8')), { name: 'changed' });
  await assert.rejects(stat(join(cache, 'schemas/objects/b/schema.json')), { code: 'ENOENT' });
  const index = JSON.parse(await readFile(join(cache, 'index.json'), 'utf8'));
  assert.equal(index.commit, third.commit);
  assert.equal(index.files.length, 2);
  assert.match(index.files[0].sha256, /^[a-f0-9]{64}$/);

  await mkdir(join(cache, '.lock'));
  await assert.rejects(fetchIiif({ cache, repository }), /Cache is locked/);
  await stat(join(cache, '.lock')); // A second process must not remove the first one's lock.
});

test('invalid or missing schemas preserve the previous cache', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'iiif-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = join(temporary, 'source');
  const cache = join(temporary, 'schemas');
  await put(source, 'a/schema.json', { original: true });
  await cacheSchemas(source, cache);
  await put(source, 'a/schema.json', { original: false });
  await put(source, 'b/schema.json', {});
  await writeFile(join(source, 'b/schema.json'), 'invalid JSON');
  await assert.rejects(cacheSchemas(source, cache), /Invalid JSON/);
  assert.deepEqual(JSON.parse(await readFile(join(cache, 'a/schema.json'), 'utf8')), { original: true });
  await rm(source, { recursive: true });
  await mkdir(source);
  await assert.rejects(cacheSchemas(source, cache), /No schema.json files/);
  await stat(join(cache, 'a/schema.json'));
});
