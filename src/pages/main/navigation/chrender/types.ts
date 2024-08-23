export type Position = {
  x: number
  y: number
}

export type ElementOption<T> = {
  position: Position
  style: {
    borderColor?: CanvasFillStrokeStyles['strokeStyle']
    backgroundColor?: CanvasFillStrokeStyles['fillStyle']
    borderWidth: number
  }
  event?: {
    hover?: boolean
    click?: boolean
    mousedown?: boolean
    mouseup?: boolean
  }
} & T
