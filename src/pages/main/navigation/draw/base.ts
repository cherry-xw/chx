import type { Position } from './types'

export default class Base {
  position: Position
  constructor(position: Position) {
    this.position = position
  }

  init() {}

  initEvent() {}
}
