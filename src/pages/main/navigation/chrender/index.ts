import type Element from './elements/basic'
import Circle from './elements/circle'
import Path from './elements/path'
import Rectangle from './elements/rectangle'
import Text from './elements/text'

export default class Chrender {
  static Path = Path
  static Circle = Circle
  static Rectangle = Rectangle
  static Text = Text

  ctx: CanvasRenderingContext2D
  constructor(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  }

  private elements: Element<any>[] = []
  add<T extends Element<any>>(element: T) {
    this.elements.push(element)
  }

  draw() {
    for (let index = 0; index < this.elements.length; index++) {
      const element = this.elements[index]
      element.draw(this.ctx)
    }
  }
}
