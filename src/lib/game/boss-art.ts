import instruments from '$lib/assets/story/liselotte-game-over.png'
import switchboard from '$lib/assets/story/liselotte-switchboard.png'
import archive from '$lib/assets/story/liselotte-archive.png'
import aviation from '$lib/assets/story/liselotte-aviation.png'
import laboratory from '$lib/assets/story/liselotte-laboratory.png'
import type { BossScene } from './boss-scenes'

export const bossArt = { instruments, switchboard, archive, aviation, laboratory } satisfies Record<BossScene, string>
