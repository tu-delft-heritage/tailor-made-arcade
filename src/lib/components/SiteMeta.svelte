<script lang="ts">
  import { env } from '$env/dynamic/public'
  import { siteHomeUrl } from '$lib/game/site-url'
  import preview from '$lib/assets/story/idle-team.png'

  const title = 'Tailor-Made Arcade | Erfgoedgame TU Delft'
  const description = 'Speel Tailor-Made Arcade: kies je teamlid, herstel de verloren labels en ontdek de erfgoedcollectie van TU Delft in een retro arcadegame.'
  const imageAlt = 'Het Tailor-Made team van TU Delft Library in pixelstijl, achter een tafel met historische instrumenten en onderwijsmodellen in het erfgoeddepot.'

  // Pages supplies the public homepage URL, including any repository base path.
  // Leave canonical URLs unset locally instead of publishing a guessed domain.
  const canonicalUrl = siteHomeUrl(env.PUBLIC_SITE_URL)
  const imageUrl = canonicalUrl ? new URL(preview, canonicalUrl).href : preview
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="application-name" content="Tailor-Made Arcade" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  {#if canonicalUrl}
    <link rel="canonical" href={canonicalUrl} />
    <meta property="og:url" content={canonicalUrl} />
  {/if}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Tailor-Made Arcade" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:locale" content="nl_NL" />
  <meta property="og:locale:alternate" content="en_GB" />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1672" />
  <meta property="og:image:height" content="941" />
  <meta property="og:image:alt" content={imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={imageUrl} />
  <meta name="twitter:image:alt" content={imageAlt} />
</svelte:head>
