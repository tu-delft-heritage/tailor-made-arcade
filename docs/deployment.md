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

To show a “Play online” QR code on the cabinet's home screen, set both values in
`.env` before starting the dev server or building the cabinet site:

```dotenv
PUBLIC_CABINET=true
PUBLIC_SITE_URL=https://example.com/tailor-made-arcade/
```

Replace the example URL with the live website, including its path if needed.
The code is generated locally and shares the public homepage URL used by SEO
metadata. An unset, empty or whitespace-only `PUBLIC_SITE_URL` hides it entirely;
it also stays hidden when cabinet mode is off. Restart the dev server after changing
`.env`, or rebuild for a static deployment. Its caption follows the selected language.

## Running on macOS

Use [Homebrew's Caddy package](https://formulae.brew.sh/formula/caddy) as an optional
system dependency. Development and GitHub Pages builds do not need Caddy.
Install [Homebrew](https://brew.sh/) first if it is not already available, then run
these commands from the repository after installing its dependencies with `pnpm install`:

```sh
brew install caddy
pnpm build
pnpm start
```

Configure `.env` before building as described above. Leave `BASE_PATH` unset for
this local root URL. Leave `PUBLIC_OBJECT_IMAGE_BASE` empty and `GAME_IMAGE_DIR`
unset unless you have prepared the optional local image cache; remote thumbnails
need an internet connection.

`pnpm start` runs `caddy file-server --root ./build --listen 127.0.0.1:4173`.
It serves the existing production build on this computer only, without rebuilding
or watching source files. Open [http://127.0.0.1:4173](http://127.0.0.1:4173) in the
cabinet browser. Keep the terminal open; Ctrl+C stops it. After updates or `.env`
changes, run `pnpm build` again and reload the browser. Keep the same browser
profile, hostname and port to retain the local high scores.

### Start automatically at login

For an unattended cabinet, edit Homebrew's Caddy configuration at
`$(brew --prefix)/etc/Caddyfile` and add the following site block. Replace the
example directory with the absolute path to this repository's `build` folder:

```caddyfile
http://127.0.0.1:4173 {
    bind 127.0.0.1
    root * "/absolute/path/to/tailor-made-arcade/build"
    file_server
}
```

Stop any foreground `pnpm start` server first so the port is available, then run:

```sh
brew services start caddy
```

This starts Caddy now and at login. Configure the cabinet browser to open the local
URL at login as well. Use `brew services restart caddy` after editing the Caddyfile
and `brew services stop caddy` to stop and disable the background service. The
service serves the same built files; it does not run `pnpm build` for you.
