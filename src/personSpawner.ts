import * as PIXI from 'pixi.js'
import { Group } from '@tweenjs/tween.js'
import { config } from './config'
import { createPerson } from './person'
import { createPersonView } from './personView'
import type { PersonView } from './floorQueues'

const MIN_SPAWN_INTERVAL = 4000 // 4 seconds
const MAX_SPAWN_INTERVAL = 10000 // 10 seconds

function randomSpawnDelay(): number {
  return MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL)
}

export function startPersonSpawner(
  app: PIXI.Application,
  tweenGroup: Group,
  floorToY: (floor: number) => number,
  onPersonReachWaitingSpot: (personView: PersonView) => void
): void {
  const scheduleSpawn = (floor: number) => {
    const delay = randomSpawnDelay()
    setTimeout(() => {
      const person = createPerson(floor)
      const view = createPersonView(app, tweenGroup, person, floorToY, () => {
        // When person reaches waiting spot, add to queue
        onPersonReachWaitingSpot({ person, view })
      })
      scheduleSpawn(floor) // Schedule next spawn for this floor
    }, delay)
  }

  // Start spawn timers for each floor
  for (let floor = 1; floor <= config.floorsCount; floor += 1) {
    scheduleSpawn(floor)
  }
}
