<script setup lang="ts">
import FrostedGlass from '@/components/FrostedGlass.vue'
import { onMounted, ref } from 'vue'

// --------------------------- config -------------------------------
defineOptions({ name: 'navigationView' })
// ---------------------------- data --------------------------------
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="navigation-container">
    <FrostedGlass style="width: 100px; height: 100px">111</FrostedGlass>
  </div>
</template>

<style lang="less" scoped>
//.navigation-container {}
</style>
