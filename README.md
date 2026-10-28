# Tailor-Made Arcade

## Play the prototype

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. **The Lost Labels** starts with your chosen
avatar accidentally dropping the collection's labels. Choose Charlotte, Daphne,
Anna, Liselotte, Isabel, Cormac, Catherine, Elin, Karin, or Jill and link the labels
back to the objects. The title screen keeps the team portraits for avatar selection.
Each teammate has a NES-style portrait based on the supplied reference photos and
bilingual character quotes. The selected portrait remains in the HUD. After a win, Next Round keeps that
avatar and increases difficulty; starting from home opens teammate selection. The ten
portraits fit a responsive grid; arrow keys follow the visible rows and columns.

A short, skippable opening shows the selected avatar's shocked expression and
spills paper labels from their portrait onto the depot floor. Every avatar has a
separate reaction portrait. The opening uses CSS animation, respects reduced motion, and
adds no animation dependency. Labels have two clipped corners at one end and
form the buttons and loose, slightly rotated answer cards. The fallen labels
remain on the floor throughout the mission. Three full-screen pixel-art rooms
rotate between questions: blue shelving, compact stacks, and the machinery hall.
Object photographs sit on display shelves in each room. Every interface element
uses the bundled Press Start 2P NES typeface. Both timers start only
when the first object photo is ready. Public art notes and depot prompts are in
[docs/art-direction.md](docs/art-direction.md) and
[docs/depot-scenes.md](docs/depot-scenes.md); portraits are bundled from
`src/lib/assets/avatars/`, including when using a custom image cache. Private
character context and avatar prompts belong in the Git-ignored `.local-context/`
directory, outside application imports and build assets.

Finishing all ten questions within the time and mistake limits brings up Cormac on a gently
rumbling motorcycle. His English encouragement varies for fast or flawless wins,
strong accuracy, close calls and harder rounds. After eight seconds the win screen
automatically opens the scoreboard; the green button opens it immediately.
The motorcycle meets the bottom edge; on narrow screens the win panel sits above it.
Next Round is available on the win screen and the following scoreboard.
Avatar selection always starts at Charlotte for a fresh game.
Timeouts, too many wrong answers and unavailable-image endings
show Liselotte in the instrument room. Her Dutch/English lines respond to the
reason for stopping and progress made; image failures get their own line.
The whole win scene slides in from the left; game over slides up from below.
Game over clears the current score to zero and never saves that failed round as a
high score. Previously saved high scores remain intact.
Correct answers earn 100 base points plus up to 100 speed-bonus points, based
on the fraction of question time remaining. Wrong answers score zero. After 60 seconds without keyboard,
pointer, or touch activity, a sparkling team scene in the depot becomes the screensaver.
On answer reveals, a warning appears after 45 seconds: “Are you still playing?”
It counts down the remaining 15 seconds and offers Continue Playing. A click or
key dismisses the warning without advancing the question; pointer movement alone
does not dismiss it. Input wakes the screensaver to the title; an abandoned mission is cleared. All motion respects
the operating system's reduced-motion preference. Scene artwork is bundled from
`src/lib/assets/story/`, and reaction portraits from `src/lib/assets/reactions/`.

A game contains **ten varied questions drawn from all 720 objects**, with an
explicit question above every scene. Sixteen formats cover object types,
materials, makers, designers, manufacturers, production places, depicted people,
professors involved in creation, dating, height/width/depth, previous owners,
linked objects, vocabulary definitions, and four-photo date comparisons.
Every reveal explains the exact source fact. Metadata rounds allow 20 seconds;
definitions and four-photo comparisons allow 30 in round one. The overall timer
is four minutes of active questions. Every successful continuation reduces time
limits by 15% (rounded to whole seconds) and adds 0.25 to the score multiplier.
Round two has 204 seconds overall, 17/26 seconds per question and 1.25× points.
Round three has 173 seconds overall, 14/22 seconds per question and 1.5× points;
further rounds continue the same progression.
Round one permits five wrong answers: the sixth ends the game immediately.
The allowance drops to four in round two, then three, two, one and zero in round
six and beyond. Exactly the allowed number can still win; exceeding it on the
last question still loses. The intro shows the current allowance, and
each new round resets the mistake count. Timeouts still end the game immediately.
Time limits stop shrinking at 40% of the originals: 96 seconds overall and
8/12 seconds per question. Points continue increasing. Each round starts its own
score at zero; home, idle and game over end the continuation. Photo replacements
keep the current difficulty. Both clocks pause immediately after an answer and
stay paused during the reveal and photo loading. Unavailable photographs are replaced
without scoring or using up a round (up to twelve replacements per mission).

Dutch and English are selectable on the title screen. Every object has at least
one eligible question in each language; not every field is translated.
English omits linked-object title questions and untranslated terms. Proper names,
numbers and source city names work in both modes. No definitions are translated
or invented. Language and scores are stored locally. The scoreboard, available from
home and both endings, shows all ten portraits and names with their best score and a bar on
a shared scale of at least 2,000 points, expanding to fit the highest record.
The top three rows have gold, silver and bronze pixel cups with matching highlights,
separated from the remaining ranks by a gap. Avatar records are shared across languages and saved
under `tailor-made-arcade:scoreboard:v1`; an older unattributed best score remains
in the home headline. A new avatar record is announced only on the winning
screen, then highlights that avatar's scoreboard row. Gameplay, game-over screens
and scoreboards opened after game over do not announce records. Ties are not new records.
Corrupt or unavailable storage does not prevent play.

Correct and incorrect answers have distinct animated stamps and border colors.
Every metadata reveal includes the original catalogue title and puts the inventory number on its own line. Four-photo
dating reveals list A–D separately, marking the correct choice. Exact complete
centuries and decades use natural labels (1800–1899 → 19th century;
1940–1949 → 1940s / jaren 1940); partial or uncertain dates retain their precision.
Distractor checks still compare the underlying source year ranges.
The last five seconds appear on the photo display for the active question or
the overall timer. The photo screen rolls upward as time runs out, while answers
stay available; reduced-motion mode keeps the photo still. Answering removes the
countdown and restores the full photo. Dimension rounds show a large proportioned
cuboid beside the object, or a flat rectangle when only two measurements exist.
Known measurements label their edges directly; the requested edge shows `?`
until the reveal. Missing dimensions are never invented.

Object-answer reveals include a QR code on the paper label: identification,
definition, four-photo comparison, and linked-object questions. It encodes
`https://heritage.tudelft.nl/objects/[uuid]`; linked-object answers use the linked
record’s UUID, while comparisons use the correct specimen. Codes are generated
locally with square ink-colored modules, a cream background and an intact quiet
zone. The QR follows the label's tilt, without a caption, and can also be opened
in a separate tab. Other metadata answers do not
show a code.

The game supports the mouse and the cabinet's external joystick and four
physical buttons, using the key mapping from Allmaps Arcade's
`src/lib/shared/environments/cabinet.ts`:

| Physical control | Key mapping | Action |
| --- | --- | --- |
| Joystick | Arrow keys | On home, up/down chooses Start or Scoreboard and left/right changes language; choose a teammate, answer, or description page |
| Green button | V or Enter | Activate the selected home action, start, skip the opening, confirm, continue, open scores after a win, retry after game over; continue to a harder round from a winning scoreboard, otherwise return home |
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

Difficulty balancing from player feedback remains planned. Existing avatar
records are retained; higher speed/multiplier scores use the same local score key.

The game uses Svelte 5, SvelteKit, Tailwind 4, XState 5, and NES.css. Its full-screen
pixel-art depot uses blue steel, cream paper labels, mustard accents,
clipped tag corners, and a subtle scanline overlay. Shared components,
question generation, and the state machine are separate under `src/lib/`. Fonts
and compiled metadata are bundled. Vocabulary providers are never contacted at
runtime. Photographs use their remote thumbnail URLs unless a local cache is
configured. Source provenance remains in the data snapshots; the game screens
only link out through the object QR labels, in a separate tab.

### Data and static builds

`data/objects.json` preserves the full normalized snapshot, including creator
roles, places, depicted people, dimensions with units, related records and
citations. `data/game-selection.json` retains the original ten-photo review;
it no longer limits the game. `data/professors.json` contains reviewed source
passages supporting professorship, combined with each object's actual creator
roles. A depicted professor is never automatically treated as a creator.

`data/question-coverage.json` is rebuilt offline with eligible counts, explicit
exclusions, sample questions/choices/answers, image URLs and source evidence for
every module and language. See [docs/question-types.md](docs/question-types.md)
for field policy and content-review limits. The runtime snapshot measures about
261 KiB gzip, just above the plan's approximate 250 KB starting budget.

```sh
pnpm build       # Compile local snapshots and export the static site to build/
pnpm preview     # Serve that build locally
```

Normal builds use checked-in metadata without fetching data. `pnpm data:prepare`
refreshes normalized metadata from the IIIF and vocabulary caches, while
`pnpm build:data` regenerates the ignored application JSON using local files
only. Run builds with `BASE_PATH=/daphnes-arcade` when deploying under that path;
the default is the domain root.

### GitHub Pages

The [Pages workflow](.github/workflows/pages.yml) builds and deploys on pushes to
`main`, and can also be started manually from Actions. In the GitHub repository,
set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**
before the first run ([GitHub setup guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)).
Only `main` is deployed. The workflow reads the site's base path from GitHub Pages,
so repository paths and custom domains use the correct asset URLs.

The workflow also sets `PUBLIC_SITE_URL` to the public Pages URL. The prerendered
homepage includes a descriptive title, Dutch description, canonical URL, Open
Graph metadata and a large X/Twitter card. Both social cards reuse
`src/lib/assets/story/idle-team.png`, with image alt text and absolute URLs.
For other hosts, set `PUBLIC_SITE_URL` to the full homepage URL (including any
base path) at build time. Local builds without it omit the canonical URL. Social
metadata follows the default Dutch page; the game still offers English in its
language selector.

CI caches the pnpm store and the generated collection JSON/coverage report.
The collection cache key includes the checked-in object, vocabulary and professor
snapshots, the data generator and question helpers, the lockfile and Node version.
An exact cache hit skips metadata generation; a miss rebuilds it offline from the
committed snapshots. To publish updated collection metadata, refresh and commit
those snapshots first.

Collection photographs are neither downloaded nor cached in CI. The build uses
remote thumbnail URLs, with local image-cache settings explicitly disabled.
Bundled game artwork remains part of the site. The workflow runs no tests.

### Local image cache

Photographs are intentionally excluded from Git. By default the app uses the
remote thumbnail URL stored in `data/objects.json`. Cache all 720 images and
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

Reruns reuse existing files; add `--refresh` to download them again. Use
`--prototype` only to cache the original ten reviewed photographs. See
`.env.example` for the complete local and cabinet configuration.

The page also feature-detects optional WebMCP tools for reading the round,
opening team selection, choosing a teammate, skipping the opening, answering,
and finishing a round. These use the same game actions as the UI;
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
