import motorcycle from '$lib/assets/story/cormac-victory.png'
import ejectionSeat from '$lib/assets/story/cormac-ejection-seat.png'
import marsRover from '$lib/assets/story/cormac-mars-rover.png'
import aircraft from '$lib/assets/story/cormac-aircraft.png'
import type { VictoryScene } from './victory-scenes'

export const victoryArt = {
  motorcycle,
  'ejection-seat': ejectionSeat,
  'mars-rover': marsRover,
  aircraft
} satisfies Record<VictoryScene, string>
