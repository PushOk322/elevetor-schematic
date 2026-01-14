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

export function createFloorQueues(): FloorQueues[] {
  return Array.from({ length: config.floorsCount + 1 }, () => ({
    upQueue: [],
    downQueue: [],
  }))
}

export function addPersonToQueue(
  queues: FloorQueues[],
  floor: number,
  personView: PersonView
): void {
  const floorQueue = queues[floor]
  if (personView.person.dir === 'up') {
    floorQueue.upQueue.push(personView)
  } else {
    floorQueue.downQueue.push(personView)
  }
}
