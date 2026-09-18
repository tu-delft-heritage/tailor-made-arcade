<script lang="ts">
  import '@fontsource/press-start-2p/latin.css'
  import '@fontsource/ibm-plex-mono/400.css'
  import '@fontsource/ibm-plex-mono/500.css'
  import '@fontsource/ibm-plex-sans/400.css'
  import '@fontsource/ibm-plex-sans/500.css'
  import '@fontsource/ibm-plex-sans/600.css'
  import 'nes.css/css/nes.min.css'
  import '../app.css'

  let { children } = $props()
</script>

{@render children()}
