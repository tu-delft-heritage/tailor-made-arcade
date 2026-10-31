# Collection-wide question generation

The runtime now includes all 720 cached objects, not the original ten-record
selection. Normalization preserves singleton/array fields, creator roles, source
IDs, locations, subjects, units, relations and citations. Builds are offline.

Run `pnpm data:prepare` after updating raw caches, then `pnpm build:data`.
The latter writes `.cache/reports/question-coverage.json`: counts, exclusions and a preview
for each module with photographs, four choices, answer and source evidence.

| Module / source | Dutch | English | Eligibility and wording |
| --- | ---: | ---: | --- |
| Object type / exampleOfWork | 720 | 299 | Source catalogue label; English requires a linked term |
| Material / material | 709 | 706 | Asks what is **recorded**, never implies an exhaustive material list |
| Maker / creator:maker | 129 | 129 | Exact role; all recorded makers excluded from distractors |
| Designer / creator:ontwerper | 83 | 83 | Separate from maker/manufacturer |
| Manufacturer / creator:producent | 330 | 330 | Separate from designer |
| Production place / locationCreated | 250 | 250 | Source city name; never inferred from maker address |
| Depicted person / about | 36 | 36 | Visual portraits, photographs, busts, medals, plaques |
| Professor / creator + automatic evidence | 31 | 31 | Actual creator role plus linked statements or an explicit source title |
| Date / temporalCoverage | 703 | 703 | Complete source year/range; distractors cannot overlap it |
| Height / height | 680 | 680 | Positive known measurements converted to mm |
| Width / width | 679 | 679 | Same |
| Depth / depth | 668 | 668 | Same; two records lack enough suitable distractors |
| Previous owner / contributor:had in bezit | 11 | 11 | Ownership never interpreted as authorship |
| Related record / isRelatedTo | 152 | — | Explicit resolvable link; concise original catalogue titles |
| Definition / linked vocabulary | 232 | 273 | Source-language first sentence, 40–300 characters, no answer/alias leak |
| Odd one out / temporalCoverage | 702 | 702 | Three photos dated within one 100-year interval, one wholly outside |

These counts are object/module candidates, not independent factual discoveries.
The same object can support multiple modules, but appears once per mission.
Every object has at least one eligible question in both languages.

## Fairness and source boundaries

Entity dictionaries normalize whitespace, case, diacritics and known URL/label
aliases. Definition checks also catch single-character spelling errors that
would otherwise disclose the answer. Choice generation excludes every correct value, duplicate/overlapping
aliases and recognizable broader/specific label variants. Person distractors
with matching surnames are excluded conservatively. Numeric distractors come
from the same measurement field, differ by at least 20%, and stay within a factor
of five. Missing values and unknown units never yield questions.

Professor evidence is derived automatically from linked Wikidata occupation and
position statements, then explicit creator titles or unambiguous name-attached
source assertions. No manually curated person list is required. The prompt allows
a *later* professor. Only objects recording that person in a creator role qualify.
A professor mentioned as a sitter, owner or laboratory founder does not qualify
on that basis. Uncertain cases are skipped. See [data.md](data.md#automatic-professor-evidence)
for the rules and generated report. English uses the same proper names.

Object titles and original descriptive alt text can leak maker/type/subject
answers. Playing images therefore use neutral bilingual alternative text. This
avoids giving away answers but is not an equivalent nonvisual game; a separately
reviewed text-friendly mode remains on the roadmap. Titles and rich descriptions
remain in the snapshot. ID/citation/image fields are provenance or presentation,
not arbitrary trivia questions.

Odd-one-out uses explicit dating instead of asserting that an unlisted material
is absent. It retains uncertain date ranges intact and rejects straddling ranges
for the three matching objects. The odd object's entire range lies outside the
named interval. Complete 100-year and ten-year intervals get localized century
and decade labels; partial ranges and qualifiers are preserved. The numeric
comparison period and original source evidence remain separate from the display
text so formatting cannot change which answer is correct. All four record IDs and image URLs differ; direct relationship
links are also avoided when choosing companions.

## Sessions and display

A seeded ten-question mix includes the user's three requested themes in every
normal mission (depicted person, place, professor), plus type, material, date,
definition, comparison, a rotating role/owner/link, and a rotating dimension.
Each round has a visible question and a source-specific explanation after the
answer. The inventory number is on its own line. Four-photo questions use A–D specimen labels that match the joystick's
2×2 choices. Definitions appear beside the reference photo. Names and long
labels use the same NES font with responsive sizing. Object-answer reveals
include a locally generated QR permalink to the correct collection record.
Linked-object questions retain the answer record ID separately from the pictured
object; four-photo comparisons link to the correct specimen. Other metadata
answers do not show a QR code.

Each question waits for all its photos. The next round is preloaded. A failed
photo replaces the current question, retaining score, progress and game time;
retries are bounded at twelve per mission to avoid an endless offline loop.
Exhausting retries shows the existing image-unavailable retry screen. Local
image caching covers all 720 records.

The compiled metadata is about 259 KiB gzip, compared with the plan's approximate
250 KB starting budget. It retains descriptions and traceable evidence; assets
and JavaScript are measured separately by the production build.

## Review limits

The metadata tests validate structure, exact recorded facts, role separation,
choice uniqueness, ranges, safe definition excerpts and seeded sessions. They
cannot establish that every picture is understandable, a dimension is visually
estimable, all source facts are historically correct, or that two differently
named vocabulary terms are never semantic synonyms. The original ten photos and
representative new rounds have been inspected; a complete photo/difficulty review
is still needed. Use the generated previews for that review, especially very
similar instrument types and source records with surprising dates.
