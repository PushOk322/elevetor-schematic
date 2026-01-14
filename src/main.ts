import './style.css'
import * as PIXI from 'pixi.js'
import * as TWEEN from '@tweenjs/tween.js'

// Create PIXI application
const app = new PIXI.Application()

// Initialize the application
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0xffffff,
})

// Add PIXI canvas to DOM
const appElement = document.querySelector<HTMLDivElement>('#app')!
appElement.innerHTML = ''
appElement.appendChild(app.canvas)

// Create elevator cabin rectangle
const cabin = new PIXI.Graphics()
cabin.rect(0, 0, 100, 150)
cabin.fill(0x333333)
cabin.x = 350
cabin.y = 225

// Add cabin to stage
app.stage.addChild(cabin)

// RAF loop for TWEEN updates and PIXI rendering
let lastTime = performance.now()

function animate(time: number) {
  const delta = time - lastTime
  lastTime = time
  
  // Update TWEEN with elapsed time
  TWEEN.update(time)
  
  // PIXI will render automatically on next frame
  requestAnimationFrame(animate)
}

// Start animation loop
requestAnimationFrame(animate)
