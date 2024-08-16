import Base from './base'
import type { Position } from './types'

export default class Draw extends Base {
  constructor(dom: HTMLCanvasElement, position: Position = { x: 0, y: 0 }) {
    super(position)
  }
}
