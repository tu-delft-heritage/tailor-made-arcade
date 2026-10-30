# Tailor-Made Arcade

A Dutch/English pixel-art collection game generated from metadata of TU Delft's [special collections](https://heritage.tudelft.nl/). Choose a team avatar, recover the lost labels, and answer ten questions drawn from 720 objects.
Faster answers earn more points; successful rounds unlock harder challenges.
Built with SvelteKit, Svelte 5, XState and NES.css.

Made to celebrate the successful conclusion of the [Tailor-Made Approach to Faculty Collections](https://www.tudelft.nl/en/library/whats-on/news-and-stories/story/2026/delft-faculties-technical-heritage-mapped-after-four-years) programme, and as a goodbye to a team of expert colleagues who will be dearly missed.

## Run locally

Requires Node.js 22.18+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite. Use the mouse or arrow keys and Enter.

```sh
pnpm build       # Generate runtime metadata and export to build/
pnpm preview     # Preview the static site
```

## Collection data

Normalized metadata is committed in `data/`. Development and production builds
compile it into the ignored `src/lib/data/game-data.json` without fetching the
collection. Object photographs use remote thumbnails. GitHub Pages builds and
deploys on pushes to `main`; CI caches dependencies, not collection data or images.
See [data maintenance](docs/data.md) and [deployment](docs/deployment.md).

## Checks

```sh
pnpm check
pnpm typecheck
pnpm test
```

## Documentation

- [Gameplay and controls](docs/gameplay.md): rules, scoring, scoreboard and cabinet controls.
- [Collection data](docs/data.md): committed snapshots, refresh commands and optional image cache.
- [Question types](docs/question-types.md): metadata policies, coverage and review limits.
- [Deployment](docs/deployment.md): GitHub Pages, configuration and social sharing.
- [Art direction](docs/art-direction.md) and [depot scenes](docs/depot-scenes.md).
- [Project plan](PLAN.md).

Private reference photos, character notes and prompts stay in the Git-ignored
`.local-context/` directory and are not bundled with the site.

## Disclaimer

The characters, dialogue and events in this game are fictionalized for entertainment.
Any resemblance to the personalities, behaviour or actions of real persons, living
or dead, is purely coincidental.
