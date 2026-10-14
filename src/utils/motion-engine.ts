import type { gsap } from 'gsap'

let engine: Promise<typeof gsap | undefined> | undefined

export function loadMotionEngine(): Promise<typeof gsap | undefined> {
  engine ??= import('gsap').then((module) => module.gsap).catch(() => undefined)
  return engine
}
