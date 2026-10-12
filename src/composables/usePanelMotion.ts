import { nextTick, onBeforeUnmount, onDeactivated, type Ref } from 'vue'

/** Preserve panel positions across filtering; keyboard updates remain immediate. */
export function usePanelMotion(container: Ref<HTMLElement | undefined>, selector: string) {
  const running = new Map<HTMLElement, Animation>()
  let revision = 0
  function cancel() {
    revision += 1
    running.forEach((animation) => animation.cancel())
    running.clear()
  }
  async function update(change: () => void, event: MouseEvent) {
    const previous = new Map(
      [...(container.value?.querySelectorAll<HTMLElement>(selector) ?? [])].map((element) => [
        element.dataset.panelKey,
        { rect: element.getBoundingClientRect(), opacity: getComputedStyle(element).opacity }
      ])
    )
    cancel()
    const current = revision
    change()
    await nextTick()
    if (event.detail === 0 || current !== revision || !container.value) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const easing = getComputedStyle(container.value).getPropertyValue('--ease-out').trim()
    container.value.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      const old = previous.get(element.dataset.panelKey)
      const rect = element.getBoundingClientRect()
      const x = old ? old.rect.left - rect.left : 0
      const y = old ? old.rect.top - rect.top : 6
      if (old && Math.abs(x) < 1 && Math.abs(y) < 1 && Number(old.opacity) === 1) return
      const animation = element.animate(
        [
          { transform: reduce ? 'none' : `translate(${x}px, ${y}px)`, opacity: old?.opacity ?? 0 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: reduce ? 125 : 200, easing }
      )
      running.set(element, animation)
      animation.onfinish = () => {
        if (running.get(element) === animation) running.delete(element)
      }
    })
  }
  onBeforeUnmount(cancel)
  onDeactivated(cancel)
  return { update, cancel }
}
