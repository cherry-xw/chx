<script setup lang="ts">
import mqtt from 'mqtt'
import { onMounted, ref } from 'vue'
// --------------------------- config -------------------------------
defineOptions({ name: 'MQTTView' })
// ---------------------------- data --------------------------------
const client = ref<Awaited<ReturnType<typeof mqtt.connectAsync>>>()
const url = ref('')
const clientId = ref('')
const username = ref('')
const password = ref('')
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
async function connectMQTT() {
  client.value = await mqtt.connectAsync('mqtt://' + url.value, {})
}
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="mqtt-container">
    <el-input v-model="url" style="width: 240px" placeholder="服务器地址">
      <template #prepend>mqtt://</template>
    </el-input>
    <el-input v-model="clientId" style="width: 240px" placeholder="clientId">
      <template #prepend>chx_</template>
    </el-input>
    <el-input v-model="username" style="width: 240px" placeholder="username" />
    <el-input v-model="password" style="width: 240px" placeholder="password" show-password />
    <el-button type="primary" @click="connectMQTT">连接</el-button>
  </div>
</template>

<style lang="less" scoped>
.mqtt-container {
  padding: 16px 12px;
}
</style>
