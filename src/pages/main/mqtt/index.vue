<script setup lang="ts">
import Connect from './connect.vue'
import Subscribe from './subscribe.vue'
import { onMounted, ref } from 'vue'
import { type MqttClient } from 'mqtt'

// --------------------------- config -------------------------------
defineOptions({ name: 'MQTTView' })
// ---------------------------- data --------------------------------
const client = ref<MqttClient | void>()
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
function setClient(c: MqttClient | void) {
  client.value = c
}
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="mqtt-container">
    <Connect @done="setClient" />
    <Subscribe :clinet="client" />
  </div>
</template>

<style lang="less" scoped>
.mqtt-container {
  padding: 16px 12px;
}
</style>
