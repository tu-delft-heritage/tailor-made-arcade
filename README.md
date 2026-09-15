# Daphne's Arcade

## Fetch IIIF schemas

Requires **Node.js 22.18+**, **pnpm**, and **Git**.

```sh
pnpm install
pnpm fetch:iiif
```

The TypeScript script fetches `build/iiif` from the `main` branch of
[collective-access-data](https://github.com/tu-delft-heritage/collective-access-data),
then extracts and caches every `schema.json`, preserving its relative path.
It uses Node's built-in TypeScript support and has no runtime npm dependencies.

```text
.cache/iiif/
  source/build/iiif/                # Complete upstream IIIF folder
  schemas/objects/<id>/schema.json  # Extracted schema files
  index.json                       # Source commit, paths, sizes, SHA-256 hashes
```

The source is a shallow, sparse Git checkout: files outside `build/iiif` are not
checked out, and GitHub's partial clone support avoids downloading their contents.
Rerunning the command fetches upstream changes, leaves unchanged schemas untouched,
and removes cached schemas deleted upstream. JSON is validated before updating the
schema cache; failures exit with a nonzero status. A lock prevents concurrent runs
from writing the same cache. Cache files are ignored by Git.

Optional custom cache location and source branch:

```sh
pnpm fetch:iiif --cache-dir ./my-cache --ref main
```

Custom cache directories should be dedicated to this script and added to your
Git ignore rules. If a process is forcibly terminated, remove its `.lock` directory
after checking that no fetch is still running.

## Checks

```sh
pnpm typecheck
pnpm test
```
