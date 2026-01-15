import type { Person, PersonDirection } from './types'
import { config } from './config'

export function createPerson(spawnFloor: number): Person {
  // Random target floor different from spawn floor
  let targetFloor: number
  do {
    targetFloor = Math.floor(Math.random() * config.floorsCount)
  } while (targetFloor === spawnFloor)

  const dir: PersonDirection = targetFloor > spawnFloor ? 'up' : 'down'

  return {
    spawnFloor,
    targetFloor,
    dir,
  }
}
