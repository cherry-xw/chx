<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Draw from './draw'
// --------------------------- config -------------------------------
defineOptions({ name: 'navigationView' })
// ---------------------------- data --------------------------------
const canvasRef = ref<HTMLCanvasElement>()
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {
  if (canvasRef.value) {
    const draw = new Draw(canvasRef.value)
    draw.run()
  }
})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="navigation-container w-full h-full">
    <canvas ref="canvasRef" class="w-full h-full" />
  </div>
</template>

<style lang="less" scoped>
//.navigation-container {}
</style>
