import Element from './basic'

export default class Rectangle extends Element<{
  shape: {
    x: number
    y: number
    width: number
    height: number
  }
}> {
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    const { shape, position, style } = this.option
    ctx.strokeStyle = style.borderColor
    ctx.fillStyle = style.backgroundColor
    ctx.rect(position.x + shape.x, position.y + shape.y, shape.width, shape.height)
    ctx.lineWidth = style.borderWidth
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
  }
}
