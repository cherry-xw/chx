import Element from './basic'

export default class Path extends Element<{
  shape: {
    points: (
      | { cmd: 'l'; x: number; y: number }
      | { cmd: 'h'; x: number }
      | { cmd: 'v'; y: number }
      | { cmd: 'c'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
      | { cmd: 'q'; cpx: number; cpy: number; x: number; y: number }
      | {
          cmd: 'a'
          rx: number
          ry: number
          rot: number
          sa: number
          ea: number
          sf: boolean
          x: number
          y: number
        }
    )[]
  }
}> {
  hover() {}
  click() {}
  mousedown() {}
  mouseup() {}
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    const { shape, position, style } = this.option
    const { points } = shape
    ctx.moveTo(position.x, position.y)
    let prevPosition = position
    for (let index = 0; index < points.length; index++) {
      const point = points[index]
      switch (point.cmd) {
        case 'l':
          ctx.lineTo(point.x, point.y)
          break
        case 'h':
          ctx.lineTo(point.x, prevPosition.y)
          break
        case 'v':
          ctx.lineTo(prevPosition.x, point.y)
          break
        case 'c':
          ctx.bezierCurveTo(point.cp1x, point.cp1y, point.cp2x, point.cp2y, point.x, point.y) //三次贝赛尔曲线
          break
        case 'q':
          ctx.quadraticCurveTo(point.cpx, point.cpy, point.x, point.y) //二次贝赛尔曲线
          break
        case 'a':
          ctx.ellipse(point.x, point.y, point.rx, point.ry, point.rot, point.sa, point.ea, point.sf)
          break
        default:
          break
      }
      if (!('x' in point)) {
        prevPosition = { ...point, x: prevPosition.x }
      } else if (!('y' in point)) {
        prevPosition = { ...point, y: prevPosition.y }
      } else {
        prevPosition = point
      }
    }
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor
    }
    if (style.borderColor) {
      ctx.strokeStyle = style.borderColor
    }
    ctx.lineWidth = style.borderWidth
    ctx.stroke()
    ctx.fill()
    ctx.closePath()
  }
}
