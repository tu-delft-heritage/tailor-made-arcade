import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const exec = promisify(execFile);
export const repositoryUrl = 'https://github.com/tu-delft-heritage/collective-access-data.git';
const defaultCache = fileURLToPath(new URL('../.cache/iiif/', import.meta.url));

async function git(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await exec('git', args, {
    cwd,
    timeout: 180_000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return stdout.trim();
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function listFiles(directory: string, prefix = ''): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}

/** Fetch only build/iiif blobs; keep the shallow Git checkout for incremental runs. */
export async function syncSource(cache: string, repository = repositoryUrl, ref = 'main') {
  const checkout = join(cache, 'source');
  if (!await exists(checkout)) {
    const temporary = await mkdtemp(join(cache, '.clone-'));
    try {
      await git(['clone', '--depth=1', '--filter=blob:none', '--no-checkout',
        '--single-branch', '--branch', ref, '--', repository, temporary]);
      await git(['sparse-checkout', 'set', '--no-cone', '/build/iiif/'], temporary);
      await git(['checkout', '--detach', 'HEAD'], temporary);
      await rename(temporary, checkout);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  } else {
    const origin = await git(['remote', 'get-url', 'origin'], checkout);
    if (origin !== repository) throw new Error(`Cache belongs to a different repository: ${origin}`);
    await git(['fetch', '--depth=1', 'origin', ref], checkout);
    await git(['checkout', '--detach', 'FETCH_HEAD'], checkout);
  }
  const source = join(checkout, 'build', 'iiif');
  if (!await exists(source)) throw new Error(`No build/iiif folder found in ${repository} (${ref}).`);
  return { source, commit: await git(['rev-parse', 'HEAD'], checkout) };
}

/** Preserve upstream paths so different objects' schema.json files never collide. */
export async function cacheSchemas(source: string, destination: string) {
  const paths = (await listFiles(source)).filter(path => path.split('/').at(-1) === 'schema.json');
  if (!paths.length) throw new Error('No schema.json files found under build/iiif; existing cache was preserved.');

  // Validate every schema before changing the existing cache.
  const schemas = await Promise.all(paths.map(async path => {
    const contents = await readFile(join(source, path));
    try {
      JSON.parse(contents.toString('utf8'));
    } catch {
      throw new Error(`Invalid JSON in build/iiif/${path}`);
    }
    return { path, contents, sha256: createHash('sha256').update(contents).digest('hex') };
  }));

  let updated = 0;
  for (const { path, contents } of schemas) {
    const target = join(destination, path);
    if (await exists(target) && contents.equals(await readFile(target))) continue;
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.tmp`;
    try {
      await writeFile(temporary, contents);
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    updated++;
  }

  const current = new Set(paths);
  let removed = 0;
  for (const path of await listFiles(destination)) {
    if (!current.has(path) && path.split('/').at(-1) === 'schema.json') {
      await rm(join(destination, path));
      removed++;
    }
  }
  return {
    files: schemas.map(({ path, sha256, contents }) => ({ path, sha256, bytes: contents.length })),
    updated,
    unchanged: schemas.length - updated,
    removed,
  };
}

export async function fetchIiif(options: { cache?: string; repository?: string; ref?: string } = {}) {
  const cache = resolve(options.cache ?? defaultCache);
  const repository = options.repository ?? repositoryUrl;
  const ref = options.ref ?? 'main';
  if (!ref || ref.startsWith('-')) throw new Error('Expected a branch name for --ref.');
  await mkdir(cache, { recursive: true });
  const lock = join(cache, '.lock');
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Cache is locked: ${lock}. If no fetch is running, remove this lock directory and retry.`);
    }
    throw error;
  }
  try {
    console.log(`Fetching build/iiif from ${repository} (${ref})…`);
    const { source, commit } = await syncSource(cache, repository, ref);
    const result = await cacheSchemas(source, join(cache, 'schemas'));
    const index = {
      repository,
      ref,
      commit,
      fetchedAt: new Date().toISOString(),
      sourceDirectory: 'source/build/iiif',
      schemaDirectory: 'schemas',
      files: result.files,
    };
    await writeFile(join(cache, 'index.json.tmp'), `${JSON.stringify(index, null, 2)}\n`);
    await rename(join(cache, 'index.json.tmp'), join(cache, 'index.json'));
    console.log(`Cached ${result.files.length} schemas: ${result.updated} updated, ${result.unchanged} unchanged, ${result.removed} removed.\nCache: ${cache}`);
    return { ...result, commit, cache };
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      'cache-dir': { type: 'string' },
      ref: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    } });
    if (values.help) {
      console.log('Usage: pnpm fetch:iiif [--cache-dir PATH] [--ref BRANCH]\n\nFetch build/iiif and cache every schema.json. Defaults: .cache/iiif, main.');
    } else {
      await fetchIiif({ cache: values['cache-dir'], ref: values.ref });
    }
  } catch (error) {
    console.error(`IIIF fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
