import { noop } from 'lodash'
import type { ElementOption, Position } from '../types'

export default abstract class Element<T> {
  option: ElementOption<T>
  constructor(option: ElementOption<T>) {
    this.option = option
    if (!option?.event?.hover) {
      this.hover = noop
    }
    if (!option?.event?.click) {
      this.click = noop
    }
    if (!option?.event?.mousedown) {
      this.mousedown = noop
    }
    if (!option?.event?.mouseup) {
      this.mouseup = noop
    }
  }
  abstract draw(ctx: CanvasRenderingContext2D): void
  abstract hover(position: Position): void
  abstract click(position: Position): void
  abstract mousedown(position: Position): void
  abstract mouseup(position: Position): void
}

// export class Line extends Element<{
//   shape: {
//     x: number
//     y: number
//     x1: number
//     y1: number
//   }
// }> {
//   draw(ctx: CanvasRenderingContext2D) {
//     ctx.beginPath()
//     const { shape, position, style } = this.option
//     ctx.strokeStyle = style.borderColor
//     ctx.moveTo(position.x + shape.x, position.y + shape.y)
//     ctx.lineTo(shape.x1, shape.y1)
//     ctx.lineWidth = style.borderWidth
//     ctx.stroke()
//     ctx.closePath()
//   }
// }

// export class Symbol extends Element {
//   constructor(option: ElementOption) {
//     super(option)
//   }
//   draw(ctx: CanvasRenderingContext2D) {}
// }

// export class Text extends Element {
//   constructor(option: ElementOption) {
//     super(option)
//   }
//   draw(ctx: CanvasRenderingContext2D) {}
// }

// export class Image extends Element {
//   constructor(option: ElementOption) {
//     super(option)
//   }
//   draw(ctx: CanvasRenderingContext2D) {}
// }
