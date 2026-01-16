import * as PIXI from 'pixi.js'
import { Group, Tween, Easing } from '@tweenjs/tween.js'
import { config } from './config'
import type { Person } from './types'

const PERSON_WIDTH = 30
const PERSON_HEIGHT = 20
const WALK_DURATION = 1500 // ms to walk from rightX to waitX

export function createPersonView(
  app: PIXI.Application,
  tweenGroup: Group,
  person: Person,
  floorToY: (floor: number) => number,
  onReachWaitingSpot?: () => void
): PIXI.Container {
  const container = new PIXI.Container()

  const color = person.dir === 'up' ? 0x0066ff : 0x00cc00 // blue for up, green for down
  const rect = new PIXI.Graphics()
  rect.rect(0, 0, PERSON_WIDTH, PERSON_HEIGHT)
  rect.fill(color)
  container.addChild(rect)

  // Target floor text
  const text = new PIXI.Text({
    text: person.targetFloor.toString(),
    style: {
      fill: 0xffffff,
      fontSize: 16,
      fontWeight: 'bold',
    },
  })
  text.anchor.set(0.5, 0.5)
  text.position.set(PERSON_WIDTH / 2, PERSON_HEIGHT / 2)
  container.addChild(text)

  // Position at spawn location (rightX)
  const floorY = floorToY(person.spawnFloor)
  container.x = config.rightX
  container.y = floorY - PERSON_HEIGHT / 2

  app.stage.addChild(container)

  // Animate walking to wait position
  const walkTween = new Tween({ x: config.rightX })
    .to({ x: config.waitX }, WALK_DURATION)
    .easing(Easing.Quadratic.InOut)
    .onUpdate(({ x }) => {
      container.x = x
    })
    .onComplete(() => {
      onReachWaitingSpot?.()
    })
    .start()

  tweenGroup.add(walkTween)

  return container
}
