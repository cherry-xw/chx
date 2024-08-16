<script setup lang="ts">
import { onMounted, ref } from 'vue'
import start from './draw'

// --------------------------- config -------------------------------
defineOptions({ name: 'DrawView' })
// ---------------------------- data --------------------------------
const canvasRef = ref<HTMLCanvasElement>()
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {
  if (canvasRef.value) start(canvasRef.value)
})
// --------------------------- other --------------------------------
</script>

<template>
  <canvas class="Draw-container w-full h-full" ref="canvasRef">1</canvas>
</template>

<style lang="less" scoped>
//.Draw-container {}
</style>
