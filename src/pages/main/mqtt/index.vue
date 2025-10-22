<script setup lang="ts">
import Connect from './connect.vue'
import { onMounted, ref } from 'vue'
// --------------------------- config -------------------------------
defineOptions({ name: 'MQTTView' })
type Config = InstanceType<typeof Connect>["$props"]["modelValue"]
// ---------------------------- data --------------------------------
const config = ref<Config>({
  protocol: 'wss://',
  url: '',
  clientId: '',
  username: '',
  friendName: '',
  password: '',
  intro: '',
  type: ''
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
