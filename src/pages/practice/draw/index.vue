<script setup lang="ts">
import { onMounted, ref } from 'vue'

// --------------------------- config -------------------------------
defineOptions({ name: 'DrawView' })
// ---------------------------- data --------------------------------
const canvasRef = ref<HTMLCanvasElement>()
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {
  const canvas = canvasRef.value as HTMLCanvasElement
  const ctx = canvas.getContext('webgl')
  if (ctx) {
    ctx.clearColor(0.0, 0.0, 0.0, 1.0)
    ctx.clear(ctx.COLOR_BUFFER_BIT)
  }
})
// --------------------------- other --------------------------------
</script>

<template>
  <canvas class="Draw-container w-full h-full" ref="canvasRef">1</canvas>
</template>

<style lang="less" scoped>
//.Draw-container {}
</style>
