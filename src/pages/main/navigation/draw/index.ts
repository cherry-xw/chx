import Chrender from '../chrender'

export default class Draw {
  chr: Chrender
  constructor(canvas: HTMLCanvasElement) {
    this.chr = new Chrender(canvas)
    const circle = new Chrender.Circle({
      position: { x: 100, y: 100 },
      shape: {
        x: 10,
        y: 10,
        radius: 10
      },
      style: {
        borderColor: '#000',
        backgroundColor: '#fff',
        borderWidth: 1
      }
    })
    this.chr.add(circle)

    const rect = new Chrender.Rectangle({
      position: { x: 200, y: 200 },
      shape: {
        x: 10,
        y: 10,
        width: 50,
        height: 50
      },
      style: {
        borderColor: '#000',
        backgroundColor: '#fff',
        borderWidth: 1
      }
    })
    this.chr.add(rect)

    const txt = new Chrender.Text({
      position: { x: 300, y: 300 },
      shape: {
        x: 10,
        y: 10,
        text: 'hello world'
      },
      style: {
        fontSize: 10,
        backgroundColor: 'red',
        fontFamily: 'Arial',
        textAlign: 'left',
        textBaseline: 'middle',
        borderWidth: 1
      }
    })
    this.chr.add(txt)
  }
  // 静态组件离屏渲染
  run() {
    requestAnimationFrame(() => {
      this.chr.draw()
    })
  }
}
