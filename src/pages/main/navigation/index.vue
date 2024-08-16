<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Draw from './draw/index'
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
    new Draw(canvasRef.value)
  }
})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="navigation-container">
    <canvas ref="canvasRef" />
  </div>
</template>

<style lang="less" scoped>
//.navigation-container {}
</style>
