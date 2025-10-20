<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import mqtt from 'mqtt'
import AnimBox from '@/components/AnimBox.vue'
import { tServe } from '@/api'

// --------------------------- config -------------------------------
defineOptions({ name: 'ConnectMQTTView' })
const config = defineModel<{
  url: string
  clientId: string
  username: string
  password: string
}>({ required: true })
// ---------------------------- data --------------------------------
const client = ref<Awaited<ReturnType<typeof mqtt.connectAsync>>>()
const state = ref(false)
const list = ref<
  {
    url: string
    clientId: string
    username: string
    password: string
  }[]
>([])
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
async function handleConnect() {
  if (!config.value.url ||
    !config.value.clientId ||
    !config.value.username ||
    !config.value.password
  ) return
  client.value = await mqtt.connectAsync('mqtt://' + config.value.url, {})
}
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(async () => {
  try {
    // const res = await tServe<{
    //   data: {
    //     url: string
    //     clientId: string
    //     username: string
    //     password: string
    //   }[]
    // }>('getMQTTUser').sync
    // list.value = res.data
  } catch (error) {
    console.error(error)
  }
})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="connect-mqtt">
    <div class="connected-info" @mouseover="state = true">
      当前连接：{{ config.username || '暂无' }}
    </div>
    <AnimBox v-model="state" which="jack" class="anim-box">
      <div class="ttl-row">
        <span>设置</span>
        <el-button size="small" class="close-btn" text :icon="Close" @click="state = false" />
      </div>
      <el-input v-model="config.url" placeholder="Server">
        <template #prepend><div style="width: 40px; text-align: center">mqtt://</div></template>
      </el-input>
      <el-input v-model="config.clientId" placeholder="ClientId">
        <template #prepend><div style="width: 40px; text-align: center">chx_</div></template>
      </el-input>
      <el-input v-model="config.username" placeholder="Username" />
      <el-input v-model="config.password" placeholder="Password" show-password />
      <el-button type="primary" @click="handleConnect">连接</el-button>
    </AnimBox>
  </div>
</template>

<style lang="less" scoped>
.connect-mqtt {
  .connected-info {
    margin-bottom: 12px;
    display: inline-block;
  }
  .anim-box {
    position: relative;
    width: 480px;
    display: flex;
    gap: 8px;
    flex-direction: column;
    background: rgba(25, 25, 25, 0.75);
    box-shadow: 0 0 8px #38383857;
    border-radius: 6px;
    padding: 8px 12px 20px;
    .ttl-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
}
</style>
