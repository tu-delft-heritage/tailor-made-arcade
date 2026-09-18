# Daphne's Arcade

## Play the prototype

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. A game contains eight identification
questions, an always-visible progress row, a 20-second question timer, a
four-minute game timer, answer explanations, results, optional arcade sounds,
and a device-local best score. Running out of question or game time ends the
session.

Dutch and English can be selected on the title screen with the mouse or the
joystick. Dutch uses all ten curated records. English sessions are assembled
only from the nine records that have an English linked-data label, English
description, and reviewed English image description. The language choice and
separate high scores are stored locally.

The game supports the mouse and the cabinet's external joystick and four
physical buttons, using the key mapping from Allmaps Arcade's
`src/lib/shared/environments/cabinet.ts`:

| Physical control | Key mapping | Action |
| --- | --- | --- |
| Joystick | Arrow keys | Select an answer in the 2×2 grid; turn description pages |
| Green button | V or Enter | Start, confirm, continue, play again |
| Yellow button | X or − | Zoom photograph out |
| Yellow button | C or + | Zoom photograph in |
| White button | Z | Toggle sound |

Answers only unlock once the photograph has loaded. Holding the green button
does not skip screens. Selection is shown with an arrow and a yellow highlight.
Mouse controls use the NES.css pointer and every visible answer and action button
is clickable.

Every screen fills the viewport without scrolling. Fullscreen and pointer hiding
are disabled by default. Set `PUBLIC_CABINET=true` to request fullscreen when a
game starts and hide the pointer for the physical cabinet. Longer descriptions
are split into pages controlled with the joystick.

This is still the first question module. Odd-one-out and definition questions,
difficulty balancing, and a named leaderboard remain planned. The current score
has a versioned storage key and will not mix with earlier one-question scores.

The game uses Svelte 5, SvelteKit, Tailwind 4, XState 5, and NES.css. Its arcade
cabinet adapts the Academic Heritage site's indigo and bright card palette,
eight-point cut corners, custom pixel bevels, and a subtle scanline overlay. Shared components,
question generation, and the state machine are separate under `src/lib/`. Fonts
and compiled metadata are bundled. Vocabulary providers are never contacted at
runtime. Photographs use their remote thumbnail URLs unless a local cache is
configured. Source provenance remains in the data snapshots; the game screens
contain no external navigation.

### Data and static builds

`data/objects.json` contains a normalized snapshot of all 720 objects.
`data/game-selection.json` selects ten prototype objects and reviewed Dutch and,
where supported, English image descriptions. Choices are built from actual type
labels in the collection and linked vocabularies. `data/data-quality.json`
records coverage, source commit, selected image references, and the temporarily
excluded Wikidata identifier. The selected photos were inspected for usable
object views; difficulty still needs feedback from players.

```sh
pnpm build       # Compile local snapshots and export the static site to build/
pnpm preview     # Serve that build locally
```

Normal builds use checked-in metadata without fetching data. `pnpm data:prepare`
refreshes normalized metadata from the IIIF and vocabulary caches, while
`pnpm build:data` regenerates the ignored application JSON using local files
only. Run builds with `BASE_PATH=/daphnes-arcade` when deploying under that path;
the default is the domain root.

### Local image cache

Photographs are intentionally excluded from Git. By default the app uses the
remote thumbnail URL stored in `data/objects.json`. Cache the selected images and
serve or bundle them locally with:

```sh
pnpm cache:images
GAME_IMAGE_DIR=.cache/game-assets PUBLIC_OBJECT_IMAGE_BASE=/objects pnpm dev
```

Use the same environment variables with `pnpm build` to copy the cached images
into the static output. `GAME_IMAGE_DIR` is the filesystem directory SvelteKit
serves as static assets; `PUBLIC_OBJECT_IMAGE_BASE` is the browser URL for its
`objects/` subdirectory. Both can point elsewhere:

```sh
pnpm cache:images -- --output-dir /path/to/arcade-assets
GAME_IMAGE_DIR=/path/to/arcade-assets PUBLIC_OBJECT_IMAGE_BASE=/objects pnpm build
```

Reruns reuse existing files; add `--refresh` to download them again. See
`.env.example` for the complete local and cabinet configuration.

The page also feature-detects optional WebMCP tools for reading, starting,
answering, and finishing a round. These use the same game actions as the UI;
unsupported browsers use the ordinary interface. Live WebMCP integration has not
been validated in a supporting browser.

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

## Fetch vocabulary labels and descriptions

After fetching the schemas:

```sh
pnpm fetch:vocabularies
```

This recursively discovers **every `sameAs` property**, including nested creators
and arrays. It deduplicates known vocabulary identifiers across HTTP/HTTPS URL
variants, preserving the original URLs and the JSON Pointer for each occurrence.
Collection-object links are recorded in the inventory, but not downloaded as
vocabulary terms. Unknown providers are reported explicitly.

Supported sources:

| Provider | Representation | Extracted fields |
| --- | --- | --- |
| Getty AAT (also supports TGN/ULAN URLs) | `.jsonld` | Preferred labels, aliases, referenced scope notes |
| Cultureelerfgoed CHT | `.jsonld` | Preferred labels, aliases, scope notes and definitions |
| Wikidata | `Special:EntityData/<QID>.json` | Labels, aliases, descriptions |
| GeoNames | Public `sws.geonames.org/<ID>/about.rdf` | Names and language-tagged names; normally no prose descriptions |

Both **Dutch (`nl`) and English (`en`)** are retained where the source provides
them. Untagged text is kept separately as `und`; it is never assumed to be Dutch
or English. No translations or definitions are invented. GeoNames RDF is parsed
with `fast-xml-parser`, without requiring a GeoNames account or API key.

```text
data/
  vocabulary-urls.json   # All unique URLs, providers, original URLs, schema references
  vocabularies.json      # Normalized labels, aliases, descriptions, fetch provenance
.cache/vocabularies/
  responses/<hash>.json  # Original JSON-LD/JSON/XML body and response metadata
  report.json            # Counts, missing description languages, failed URLs
```

The `data/` files are intended to be checked into the repository for later static
builds. Raw response caches and reports are ignored by Git. Each term has this
shape (text below is illustrative):

```json
{
  "url": "http://vocab.getty.edu/aat/300010900",
  "provider": "getty",
  "labels": { "nl": ["metaal"], "en": ["metal"] },
  "aliases": { "en": ["metals"] },
  "descriptions": { "nl": ["…"], "en": ["…"] },
  "source": {
    "requestUrl": "https://vocab.getty.edu/aat/300010900.jsonld",
    "responseUrl": "https://vocab.getty.edu/aat/300010900.jsonld",
    "fetchedAt": "2026-09-15T00:00:00.000Z"
  }
}
```

Rerunning reuses successful cached responses and retries previously failed URLs.
Use `--refresh` to update all responses, or `--offline` to regenerate the normalized
files from the raw cache without network requests:

```sh
pnpm fetch:vocabularies --refresh
pnpm fetch:vocabularies --offline
pnpm fetch:vocabularies --schemas-dir .cache/iiif/schemas --cache-dir .cache/vocabularies --output-dir data --concurrency 3
```

Requests have a 30-second timeout, three attempts for temporary failures, and at
most three concurrent downloads by default. HTTP 429/5xx responses are retried;
long `Retry-After` periods are reported for a later run. Invalid responses never
replace a valid cached copy. Missing descriptions are normal data gaps; failed
requests or unsupported providers are listed in the report and cause exit code 1
after all URLs have been processed. Available results are still exported. Two
`.vocabularies.lock` directories protect the cache and output from concurrent
writes; remove a stale lock only after confirming no fetch is running.

### Initial fetch results

The current snapshot has **208 external URLs**, plus **152 collection-object
links**. The initial run cached **207 vocabulary records**, including **135 with
Dutch descriptions** and **140 with English descriptions**. Getty accounts for
126 records, of which 120 have descriptions in both languages. All 54 GeoNames
records were retrieved, but none provides Dutch or English prose descriptions.

One upstream identifier returned HTTP 404:
[Wikidata Q138148494](https://www.wikidata.org/entity/Q138148494), referenced as
`exampleOfWork.sameAs` for “polarisatie prisma” in object
`86092889-a03d-459a-a076-577fdf18f2de`. Its original reference remains in the URL
inventory. The command will report this failure until the source is corrected
or the entity becomes available; it does not substitute a guessed identifier.

## Checks

```sh
pnpm check
pnpm typecheck
pnpm test
```
