<script setup lang="ts">
import Connect from './connect.vue'
import { onMounted, ref } from 'vue'
// --------------------------- config -------------------------------
defineOptions({ name: 'MQTTView' })
// ---------------------------- data --------------------------------
const config = ref<{
  url: string
  clientId: string
  username: string
  password: string
}>({
  url: '',
  clientId: '',
  username: '',
  password: ''
})
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="mqtt-container">
    <Connect v-model="config" />
  </div>
</template>

<style lang="less" scoped>
.mqtt-container {
  padding: 16px 12px;
}
</style>
