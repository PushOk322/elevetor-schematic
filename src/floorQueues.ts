import * as PIXI from 'pixi.js'
import type { Person } from './types'
import { config } from './config'

export interface PersonView {
  person: Person
  view: PIXI.Container
}

export interface FloorQueues {
  upQueue: PersonView[]
  downQueue: PersonView[]
}

const QUEUE_GAP = 8 // px gap between people in queue

function layoutQueue(queue: PersonView[]) {
  for (let i = 0; i < queue.length; i += 1) {
    const pv = queue[i]
    pv.view.x = config.waitX + i * (pv.view.width + QUEUE_GAP)
  }
}

export function createFloorQueues(): FloorQueues[] {
  return Array.from({ length: config.floorsCount }, () => ({
    upQueue: [],
    downQueue: [],
  }))
}

export function addPersonToQueue(
  queues: FloorQueues[],
  floor: number,
  personView: PersonView
): void {
  const max = config.floorsCount - 1

  if (!Number.isFinite(floor)) {
    console.error('[QUEUE] floor is not finite', { floor, person: personView.person })
    return
  }

  if (floor < 0 || floor > max) {
    console.error('[QUEUE] floor out of range', {
      floor,
      max,
      floorsCount: config.floorsCount,
      queuesLen: queues.length,
      person: personView.person,
    })
    return
  }

  const floorQueue = queues[floor]
  if (!floorQueue) {
    console.error('[QUEUE] floorQueue missing', {
      floor,
      floorsCount: config.floorsCount,
      queuesLen: queues.length,
    })
    return
  }

  if (personView.person.dir === 'up') floorQueue.upQueue.push(personView)
  else floorQueue.downQueue.push(personView)
}


export function relayoutFloorQueues(queues: FloorQueues[], floor: number) {
  const fq = queues[floor]
  layoutQueue(fq.upQueue)
  layoutQueue(fq.downQueue)
}
