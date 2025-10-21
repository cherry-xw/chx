<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import mqtt from 'mqtt'
import AnimBox from '@/components/AnimBox.vue'
import { tServe } from '@/api'
import { chain } from 'lodash'
type Config = {
  url: string
  clientId: string
  username: string
  password: string
  intro: string
  type: string
}
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
const list = ref<Config[]>([])
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
async function handleConnect() {
  if (
    !config.value.url ||
    !config.value.clientId ||
    !config.value.username ||
    !config.value.password
  )
    return
  client.value = await mqtt.connectAsync('mqtt://' + config.value.url, {})
}
function changeCurrent(item: Config) {
  config.value.clientId = item.clientId
  config.value.url = item.url
  config.value.username = item.username
  config.value.password = item.password
}
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
onMounted(async () => {
  try {
    const res = await tServe<{
      data: {
        _id: string
        type: string
        intro: string
        name: string
      }[]
    }>('/device/list', 'GET').sync
    list.value = chain(res.data)
      .map((item) => ({
        url: '',
        clientId: item._id,
        username: item.name,
        password: '',
        intro: item.intro,
        type: item.type
      }))
      .sortBy('type')
      .value()
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
      <div class="device-list">
        <el-tooltip
          v-for="value in list"
          :key="value.clientId"
          class="box-item"
          effect="dark"
          :content="value.intro"
          placement="top-start"
        >
          <el-button :disabled="value.type === 'device'" @click="changeCurrent">{{
            value.username
          }}</el-button>
        </el-tooltip>
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
  .device-list {
    display: flex;
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
