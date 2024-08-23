import type { Position } from '../types'
import Element from './basic'

export default class Circle extends Element<{
  shape: {
    x: number
    y: number
    radius: number
  }
}> {
  protected hoverState: boolean = false

  hover(position: Position) {
    const { shape } = this.option
    const { x, y, radius } = shape
    const distance2 = Math.pow(Math.pow(position.x - x, 2) + Math.pow(position.y - y, 2), 2)
    this.hoverState = distance2 <= radius * radius
  }

  click() {}

  protected clickState: boolean = false
  mousedown() {
    if (this.hoverState) {
      this.clickState = true
    }
  }
  mouseup() {
    if (this.clickState && this.hoverState) {
      this.click()
    }
    this.clickState = false
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    const { shape, position, style } = this.option
    if (style.borderColor) {
      ctx.strokeStyle = style.borderColor
    }
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor
    }
    ctx.arc(position.x + shape.x, position.y + shape.y, shape.radius, 0, Math.PI * 2)
    ctx.lineWidth = style.borderWidth
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
  }
}
