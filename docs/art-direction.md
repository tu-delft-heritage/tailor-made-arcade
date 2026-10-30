# Tailor-Made Arcade: The Lost Labels

Ten NES-style portraits were generated with the built-in image generation tool,
using user-supplied reference photos for likeness. Final assets:
`src/lib/assets/avatars/<name>.png`.

The interface shows each teammate’s name and a short fictional game quote.
Cormac’s greeting, “How are you today?”, stays in English in both languages.

Each avatar also has a shocked expression in `src/lib/assets/reactions/` for the
opening label spill. Portraits appear in avatar selection, the opening and the HUD;
the title screen has no team lineup.

`src/lib/assets/story/` contains the illustrated Liselotte game-over scene, four
transparent Cormac victory sprites, and the team screensaver in the depot.
The victory sprites show the motorcycle (`cormac-victory.png`), heritage ejection
seat (`cormac-ejection-seat.png`), Mission MARIJN rover (`cormac-mars-rover.png`),
and weathered aircraft (`cormac-aircraft.png`). They use the original Cormac avatar
for likeness and user-supplied photographs for the objects.
Quotes are rendered as text rather than embedded in the artwork. Each vehicle has
its own CSS animation: motorcycle rumble, seat ejection, rover suspension bounce,
or aircraft wobble. All animations, falling labels and sparkles respect reduced motion.

## Visual style

Square head-and-shoulders portraits use chunky pixel edges, a limited palette,
dark navy outlines, three-tone shading and a solid indigo background. Portraits
have no embedded text or border and share the same framing.

New portraits and their reaction variants match the original portraits' coarse
pixel scale. The depot screensaver uses the avatar designs in a coarser Atari-style
scene, with animated sparkles layered over the instruments.

## Local context

Private character notes and original avatar prompts live in the Git-ignored
`.local-context/` directory. They are assistant reference material and must not
be imported by the application or copied into public documentation.

## Depot reference

Three full-screen generated pixel-art backgrounds provide the depot scenes.
See [depot-scenes.md](depot-scenes.md) for reference photographs, final asset
locations and background-generation prompts. The original reference photographs
are not bundled in the game.
