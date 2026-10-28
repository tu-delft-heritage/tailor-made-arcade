# Gameplay and controls

**The Lost Labels** starts with your chosen
avatar accidentally dropping the collection's labels. Choose Charlotte, Daphne,
Anna, Liselotte, Isabel, Cormac, Catherine, Elin, Karin, or Jill and link the labels
back to the objects. The title screen keeps the team portraits for avatar selection.
Each teammate has a NES-style portrait based on the supplied reference photos and
bilingual character quotes. The selected portrait remains in the HUD. After a win, Next Round keeps that
avatar and increases difficulty; starting from home opens teammate selection. The ten
portraits fit a responsive grid; arrow keys follow the visible rows and columns.
All ten selection portraits preload when the app opens; the selected reaction
portrait preloads while choosing an avatar.

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
[art-direction.md](art-direction.md) and
[depot-scenes.md](depot-scenes.md); portraits are bundled from
`src/lib/assets/avatars/`, including when using a custom image cache. Private
character context and avatar prompts belong in the Git-ignored `.local-context/`
directory, outside application imports and build assets.

## Endings and inactivity

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

## Questions, difficulty and scoring

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
8/12 seconds per question. Points continue increasing. Next Round carries the
current score forward, accumulating points across consecutive rounds with the
same avatar. A fresh game starts at zero; home, idle and game over clear the run.
Photo replacements
keep the current difficulty. Both clocks pause immediately after an answer and
stay paused during the reveal and photo loading. Unavailable photographs are replaced
without scoring or using up a round (up to twelve replacements per mission).

## Languages and scoreboard

Dutch and English are selectable on the title screen. Every object has at least
one eligible question in each language; not every field is translated.
English omits linked-object title questions and untranslated terms. Proper names,
numbers and source city names work in both modes. No definitions are translated
or invented. Language and scores are stored locally. The scoreboard, available from
home and both endings, shows all ten portraits and names with their best score and a bar on
a shared scale of at least 2,000 points, expanding to fit the highest record.
The high-score column records each avatar's highest run total, saved after each
successful round. Points accumulate within a run, but separate runs are never
added together. Losing a later round clears the current total while preserving
the high score saved at the last successful round.
The top three rows have gold, silver and bronze pixel cups with matching highlights,
separated from the remaining ranks by a gap. Avatar records are shared across languages and saved
under `tailor-made-arcade:scoreboard:v1`; an older unattributed best score remains
in the home headline. A new avatar record is announced only on the winning
screen, then highlights that avatar's scoreboard row. Gameplay, game-over screens
and scoreboards opened after game over do not announce records. Ties are not new records.
Corrupt or unavailable storage does not prevent play.
Language and older unattributed records use the `tailor-made-arcade:` storage
prefix. A compatibility migration preserves values saved under the former name.

## Answer feedback

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

## Controls

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

The home screen has a sound switch beside the language selector. It uses the
same sound setting as the Z shortcut and is hidden in cabinet mode, where the
physical white button remains available.

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

## Browser integration

The page also feature-detects optional WebMCP tools for reading the round,
opening team selection, choosing a teammate, skipping the opening, answering,
and finishing a round. These use the same game actions as the UI;
unsupported browsers use the ordinary interface. Live WebMCP integration has not
been validated in a supporting browser.
