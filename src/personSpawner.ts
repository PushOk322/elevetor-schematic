import * as PIXI from 'pixi.js'
import { Group } from '@tweenjs/tween.js'
import { config } from './config'
import { createPerson } from './person'
import { createPersonView } from './personView'
import {type FloorQueues, type PersonView} from './floorQueues'

const MIN_SPAWN_INTERVAL = 8000
const MAX_SPAWN_INTERVAL = 20000

function randomSpawnDelay(): number {
  return MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL)
}

export function startPersonSpawner(
  app: PIXI.Application,
  tweenGroup: Group,
  floorToY: (floor: number) => number,
  onPersonReachWaitingSpot: (personView: PersonView) => void,
  floorQueues: FloorQueues[]
): void {
  const scheduleSpawn = (floor: number) => {
    const delay = randomSpawnDelay()
    setTimeout(() => {
      // Check queue length before spawning
      const fq = floorQueues[floor]
      const totalInQueue = fq.upQueue.length + fq.downQueue.length
      if (totalInQueue >= 5) {
        scheduleSpawn(floor) // Reschedule if too many
        return
      }


      const person = createPerson(floor)
      const view = createPersonView(app, tweenGroup, person, floorToY, () => {
        // When person reaches waiting spot, add to queue

        console.log('[PERSON REACHED WAITING SPOT floor]', floor)
        onPersonReachWaitingSpot({ person, view })
        // relayoutFloorQueues(queues, floor)
      })
      scheduleSpawn(floor) // Schedule next spawn for this floor
    }, delay)
  }

  // Start spawn timers for each floor
  for (let floor = 0; floor < config.floorsCount; floor += 1) {
    console.log('[SPAWN LOOP floor]', floor)
    scheduleSpawn(floor)
  }


}
