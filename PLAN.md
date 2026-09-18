# Daphne's Arcade — implementation plan

## Implemented status — September 18, 2026

Ten-round missions now draw from the full 720-object snapshot. Sixteen modules
cover object type, material, maker, designer, manufacturer, creation place,
depicted person, professor involved in creation, date, three dimensions, previous
owner, related object, definition and four-photo date comparison. Every round
shows an explicit question and a source-based reveal. All objects are eligible
in Dutch and English; English has fifteen modules because linked-object titles
are not translated. No missing metadata is interpreted as absence.

The NES-only interface retains seven selectable teammates, their quotes, three
spatial depot scenes, loose answer tags and persistent fallen labels. Ten varied
modules per mission avoid repeated object IDs and image URLs. Failed photographs
are replaced without consuming a round; loading time is excluded from the timer.
Definitions/comparisons get 30 seconds; other rounds get 20; total play time is
four minutes. Best scores use a new 1,000-point scale and storage version.

`data/question-coverage.json` contains coverage, exclusions, previews and evidence.
`docs/question-types.md` documents field rules and remaining review limits.
Automated checks cover all generated answers, 100 seeds per language, source
facts, role separation, aliases, date overlap, readiness, replacement, scoring
and replay. The named leaderboard, complete image/content review, and difficulty
calibration remain future work.

## Goal

A static, replayable heritage quiz celebrating Daphne's work on the collection
metadata. A game contains ten varied questions, with object photographs as the
main attraction, a retro arcade interface, explanations after each answer, and a
high-score table stored on the player's device.

The sections below retain the broader roadmap; the status above records what is implemented.
Confirmed language: Dutch first, with an English mode restricted to eligible
translated content. Current defaults: ten rounds, four answer choices, 20 seconds for metadata and
30 seconds for definitions/comparisons, with four minutes overall.
Support four to six photos in the question
model, with four as the first release's default.

## Evidence from the repositories

Reference: `../arcade` (Allmaps Arcade). Reuse its approach to Svelte 5 components,
Tailwind styling, XState game flow, shared TypeScript logic, keyboard interaction,
and separate title, round, explanation, results, and high-score screens. Follow its
Prettier conventions: two spaces, single quotes, no semicolons, no trailing commas.
Use the relevant existing libraries; build the quiz-specific components here.

The current cached upstream snapshot contains:

| Data | Coverage |
| --- | ---: |
| Objects with image references and named object types | 720 / 720 |
| Distinct object-type labels | 217 |
| Type labels represented by at least three objects | 71 |
| Objects with named materials | 709 |
| Objects with named creators | 494 |
| Objects with temporal coverage | 703 |
| Objects with multiple image records | 180 |
| Objects with linked object-type identifiers | 339 |

The ten prototype images have been checked for availability and visual quality;
the remaining collection images still need review.
Vocabulary enrichment is now available through `pnpm fetch:vocabularies`: the first
run cached 207 of 208 external records, with 135 Dutch and 140 English descriptions.
One Wikidata identifier returns 404; see README.md. The linked
sources include Getty AAT, Cultureelerfgoed's thesaurus, Wikidata, and GeoNames.
The main type/material/creator/place fields contain 207 distinct source URLs:
126 Getty, 13 Cultureelerfgoed, 14 Wikidata, and 54 GeoNames.

## 1. Player experience

1. **Title:** Daphne's Arcade, a short dedication, high score, and a green-button
   start prompt. Keep screen text minimal.
2. **Game:** ten questions, a visible round counter and score, consistent answer
   cards selected with the external joystick and confirmed with the green button.
3. **Reveal:** show the correct answer, a brief explanation, the actual metadata
   behind the question. Paginate long text with the joystick. Advance with the
   green button when the player is ready; retain source links in the data.
4. **Results:** score, correct answers, a gallery of encountered objects, and an
   invitation to enter initials for the local leaderboard.
5. **Play again:** a new randomized selection with repeated objects and terms
   avoided within a session where the available pool permits it.

Keep the tone curious and celebratory. Wrong answers should reveal something
interesting about the objects. Show object titles after answering when they would
give away the answer beforehand; apply the same rule to accessible descriptions.
Use reviewed, non-answer-revealing image descriptions, with a text-friendly mode
for question formats whose essential information is visual.

### Current question mix

Each mission includes object type, material, place, depicted person, professor,
date, a linked definition, a four-photo dating comparison, one of
maker/designer/manufacturer/owner/related object, and one dimension. Ordering,
objects and answer placement are seeded. The extra role and dimension vary
between missions. If a module lacks eligible records, another supported module
fills the slot. The original 4/4/2 mix has been superseded by the requested
metadata expansion.

### Fair questions

- Generate from explicit, validated metadata. Missing metadata is not evidence
  that an object lacks a material or other property.
- For odd-one-out, name the comparison dimension or category. For example, ask
  which object is not catalogued as a theodolite, rather than asking an unrestricted
  “Which does not belong?” Material rounds need stricter review because material
  lists overlap and may be incomplete.
- Require exactly one correct option. Normalize equivalent identifiers, labels,
  and aliases; exclude broader/narrower terms that would also be defensible answers.
- Choose plausible distractors from the same field and at comparable specificity.
  Introduce closely related types only after review, as a higher difficulty.
- Exclude repeated images, different photographs of the same object, and known
  duplicate records from a question. Use relationship links as review signals,
  without assuming every related object is a duplicate.
- Use definitions available in the chosen language. Reject clues that name the
  answer or a recognizable alias; support reviewed, attributed edits in overrides.
- Generate a reviewable question preview and explicit exclusion reasons. Metadata
  correctness alone does not establish that a visual question is understandable.

## 2. Data pipeline

Keep network refreshes explicit and separate from normal builds:

```text
pnpm data:refresh
  fetch upstream IIIF -> extract schemas -> enrich linked terms -> validate

pnpm build
  compile checked-in data -> generate compact game data -> build static app
```

Extend the existing `fetch:iiif` script, preserving its source-commit tracking and
incremental fetch behavior. The current `.cache/iiif` remains a working cache.
Add checked-in, reviewable data snapshots so a clean checkout can build without
contacting metadata providers:

```text
data/
  objects/          # Extracted upstream schema.json records
  terms/            # Normalized linked terms and definitions
  overrides.json    # Reviewed aliases, clue edits, exclusions, image choices
  provenance.json  # Upstream commit and enrichment source/retrieval information
.cache/
  iiif/             # Existing sparse source checkout
  linked-data/      # Raw responses and HTTP cache information
```

### Normalize and enrich

- Validate upstream data with Zod and convert singleton-or-array fields into
  consistent arrays. Flatten creator roles; preserve source identifiers.
- Assign stable object and term IDs. Prefer linked identifiers for grouping;
  otherwise use a field-specific local ID plus a normalized label. Keep the
  original text for display and traceability.
- Normalize images using schema records and companion IIIF manifests. Resolve
  actual image-service IDs and request capabilities rather than assuming that
  every `contentUrl` can be used as a full image URL. Select useful overview photos.
- Add independent provider adapters. Prioritize Getty and Cultureelerfgoed for
  type/material definitions; add Wikidata and GeoNames when creator/place rounds
  justify them. Verify endpoints and representative responses before bulk fetching.
- Fetch only referenced entities. Store labels, definitions, language, aliases,
  useful broader-term relationships, source URLs, and attribution information.
- Limit request concurrency, use timeouts and retries, honor provider throttling,
  and retain valid cached responses on temporary failures. Record unavailable
  definitions explicitly; do not manufacture replacements.

Getty publishes vocabulary records as linked data and includes scope notes useful
for definitions: [Getty vocabularies](https://www.getty.edu/research/tools/vocabularies/)
and [linked-data access](https://www.getty.edu/research/tools/vocabularies/lod/).

### Compile for the browser

Produce compact, versioned JSON containing objects, deduplicated term dictionaries,
image references, localized clues, and eligible question groups. Preserve just
enough provenance to explain answers and show attribution. Do not ship raw linked
data responses or every possible question combination.

Build an eligibility report covering usable images, language coverage, ambiguous
terms, excluded records, and available questions per module. Set minimum pool sizes
for the intended ten-round mix. Begin with an approximately 250 KB compressed
metadata budget, then measure and adjust after the first compiler pass.

The browser uses bundled metadata and local optimized photographs. Preload the
next round and replace failed-image questions without penalizing the player.
Expand the locally packaged photo selection as more question types are added.

## 3. Application architecture

Use Svelte 5, SvelteKit, TypeScript, Tailwind, and pnpm. Produce static output with
[`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static), keeping the
root page prerenderable and browser-only state initialized after mounting.

Use XState for the game lifecycle, following the reference repository, with
[`@xstate/svelte`](https://stately.ai/docs/xstate-svelte) for component integration.
Use Bits UI for accessible dialogs and controls where useful, and Zod for data
validation. Prefer a compatible stable dependency set and commit the pnpm lockfile.
Use ordinary images for answer cards. If deep zoom is added, evaluate the reference
project's OpenLayers IIIF implementation for a viewer loaded only when opened.

```text
scripts/
  fetch-iiif.ts
  enrich-terms.ts
  build-game-data.ts
  providers/
src/lib/
  components/        # Arcade shell, buttons, cards, score, source attribution
  screens/           # Title, instructions, round, reveal, results, leaderboard
  game/
    machine.ts       # Lifecycle and event handling
    session.ts       # Seeded selection, round mix, repetition rules
    scoring.ts
    types.ts
    questions/
      registry.ts
      odd-one-out/
      identify-object/
      definition/
  data/              # Runtime types and generated-data loading
  storage/           # Versioned local scores and preferences
src/routes/
  +layout.svelte
  +page.svelte
```

Each question module supplies eligibility rules, a deterministic generator, answer
validation, an explanation, and its Svelte renderer. The shared engine handles
round transitions, scores, loading, input locking, and results. Adding a question
type should require one module and a registry entry, without rewriting the engine.

Generate validated candidate pools during the build; assemble sessions in the
browser with a seed. Save the seed, dataset version, and rules version with scores
so a session can be reproduced and later changes do not silently alter results.

## 4. Visual direction and scoring

Use a dark arcade-cabinet palette with bright cyan, magenta, amber, and cream;
pixel-style headings; chunky borders and buttons; and restrained score animations.
Keep heritage photos sharp and uncropped where possible. Use a readable font for
definitions and explanations. Make sound optional and respect reduced motion.
Use a prominent selected-answer highlight and a spatial 2-by-2 grid. Follow the
reference cabinet mapping: arrow keys select, V confirms, X/C zoom, Z toggles
sound. All screens fit the viewport without scrolling or touch controls. Extend
spatial navigation to a 3-by-2 grid when six options are appropriate.

Current scoring is 100 points per correct answer, ten rounds, and a 1,000-point
maximum. Metadata uses 20 seconds, definitions/comparisons 30, and a four-minute overall
timer, with no speed bonus. Future modes should use separate leaderboard categories
so scores remain comparable.

Store the top local scores with initials, points, correct answers, date, mode,
question count, seed, and data/rules versions. Label the table “High scores on this
device.” Handle missing, corrupt, or unavailable localStorage without blocking
play. Prevent repeated submissions from scoring or saving a result twice.

## 5. Delivery sequence

1. **Data and question feasibility:** normalize all records, verify sample images
   and provider responses, measure definition-language coverage, and produce a
   report plus reviewed example questions for each proposed module.
2. **Playable slice:** scaffold the static Svelte app and arcade theme; implement
   title, one identification round, reveal, and results with actual object data.
3. **Complete game:** add odd-one-out and definition modules, seeded ten-round
   sessions, question balancing, scoring, and the local leaderboard.
4. **Celebration and polish:** dedication, source-rich reveals, object gallery,
   sound and motion preferences, image fallbacks, cabinet controls and fullscreen refinement.
5. **Verification and release preparation:** test generators and state transitions,
   review representative questions, check a full game in the browser, and verify
   a clean static build, including hosting under a subpath. Deployment destination
   can be selected when the game is ready.

## Acceptance checks

- A clean checkout builds from committed metadata without provider requests.
- Every generated question has the requested option count, one valid answer,
  distinct options, an explanation, and traceable evidence.
- Many seeded sessions finish with ten valid questions and respect repetition
  rules; generator exhaustion yields a controlled fallback rather than a loop.
- Answer locking, round advancement, restart, and image failures behave correctly.
- A complete game works using only the cabinet joystick and mapped buttons,
  with no scrolling; local scores survive reload.
- Corrupt or unavailable storage does not prevent play.
- Content review confirms fair distractors, usable photos, and clues that do not
  reveal their answers. Language and difficulty are checked with likely players.

The collection-wide question milestone is implemented. The next work is full
photo/content review, player-informed difficulty, and the named local leaderboard.
