import Element from './basic'

export default class Text extends Element<{
  shape: {
    x: number
    y: number
    text: string
  }
  style: {
    fontSize: number
    fontFamily: string
    textAlign: CanvasTextAlign
    textBaseline: CanvasTextBaseline
    borderColor?: CanvasFillStrokeStyles['strokeStyle']
    backgroundColor?: CanvasFillStrokeStyles['fillStyle']
  }
}> {
  hover() {}
  click() {}
  mousedown() {}
  mouseup() {}
  draw(ctx: CanvasRenderingContext2D) {
    const { shape, position, style } = this.option
    ctx.font = `${style.fontSize}px ${style.fontFamily}`
    ctx.textAlign = style.textAlign
    ctx.textBaseline = style.textBaseline
    ctx.lineWidth = style.borderWidth
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor
      ctx.fillText(shape.text, position.x, position.y)
    }
    if (style.borderColor) {
      ctx.strokeStyle = style.borderColor
      ctx.strokeText(shape.text, position.x, position.y)
    }
  }
}
