import type { Position } from './types'

export default class Base {
  ctx: CanvasRenderingContext2D
  position: Position
  constructor(canvas: HTMLCanvasElement, position: Position) {
    this.position = position
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  }

  init() {}

  initEvent() {}
}
