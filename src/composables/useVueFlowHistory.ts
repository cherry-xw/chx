// src/composables/useVueFlowHistory.ts
import { ref, watch, computed } from 'vue'
import type { Ref } from 'vue'
import { cloneDeep } from 'lodash'

export function useVueFlowHistory(
  nodes: Ref<any[]>,
  edges: Ref<any[]>
) {
  const history = ref<{ nodes: any[]; edges: any[] }[]>([])
  const currentIndex = ref<number>(-1)

  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)

  // Watch for changes and record history
  watch(
    [nodes, edges],
    () => {
      // Remove future history if we're not at the end
      if (currentIndex.value < history.value.length - 1) {
        history.value.splice(currentIndex.value + 1)
      }

      // Add new state to history
      history.value.push({
        nodes: cloneDeep(nodes.value),
        edges: cloneDeep(edges.value)
      })

      currentIndex.value = history.value.length - 1

      // Limit history size to prevent memory issues
      if (history.value.length > 50) {
        history.value.shift()
        currentIndex.value--
      }
    },
    { deep: true }
  )

  function undo(): void {
    if (!canUndo.value) return

    currentIndex.value--
    const state = history.value[currentIndex.value]
    nodes.value = cloneDeep(state.nodes)
    edges.value = cloneDeep(state.edges)
  }

  function redo(): void {
    if (!canRedo.value) return

    currentIndex.value++
    const state = history.value[currentIndex.value]
    nodes.value = cloneDeep(state.nodes)
    edges.value = cloneDeep(state.edges)
  }

  function clearHistory(): void {
    history.value = []
    currentIndex.value = -1
  }

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory
  }
}