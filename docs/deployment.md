# Deployment

## GitHub Pages

The [Pages workflow](../.github/workflows/pages.yml) builds and deploys on pushes to
`main`, and can also be started manually from Actions. In the GitHub repository,
set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**
before the first run ([GitHub setup guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)).
Only `main` is deployed. The workflow reads the site's base path from GitHub Pages,
so repository paths and custom domains use the correct asset URLs.

## Social sharing and metadata

The workflow also sets `PUBLIC_SITE_URL` to the public Pages URL. The prerendered
homepage includes a descriptive title, Dutch description, canonical URL, Open
Graph metadata and a large X/Twitter card. Both social cards reuse
`src/lib/assets/story/idle-team.png`, with image alt text and absolute URLs.
For other hosts, set `PUBLIC_SITE_URL` to the full homepage URL (including any
base path) at build time. Local builds without it omit the canonical URL. Social
metadata follows the default Dutch page; the game still offers English in its
language selector.

## Build inputs and caching

CI caches package dependencies. Each deployment runs `pnpm build`, which compiles
the committed collection snapshots into the ignored runtime JSON and builds the
site. This quick, offline step needs no separate collection cache. To update the
catalogue, follow the [data refresh instructions](data.md#refresh-the-collection)
and commit the reviewed snapshots first.

Collection photographs are neither downloaded nor cached in CI. The build uses
remote thumbnail URLs, with local image-cache settings explicitly disabled.
Bundled game artwork remains part of the site. The workflow runs no tests.

## Other hosts and cabinet configuration

```sh
BASE_PATH=/tailor-made-arcade pnpm build
pnpm preview
```

The static site is written to `build/`. `BASE_PATH` defaults to the domain root;
set it to the host's actual subdirectory when needed. Set `PUBLIC_SITE_URL` to the
full public homepage URL when building for a host other than GitHub Pages.

Set `PUBLIC_CABINET=true` to request fullscreen at game start and hide the pointer
for the physical cabinet. The default browser experience keeps the pointer and
does not request fullscreen. See [gameplay.md](gameplay.md#controls) for controls
and [`.env.example`](../.env.example) for configuration examples. For offline
photographs, see [the optional local image cache](data.md#local-image-cache).
