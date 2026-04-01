<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
import mqtt from 'mqtt'
import AnimBox from '@/components/AnimBox.vue'
import { tServe } from '@/api'
import { chain } from 'lodash'
import { decode, encode } from '@/utils/common'
type Config = {
  protocol: string
  url: string
  clientId: string
  username: string
  friendName: string
  password: string
  intro: string
  type: string
}
// --------------------------- config -------------------------------
defineOptions({ name: 'ConnectMQTTView' })
const emit = defineEmits<{
  done: [client: mqtt.MqttClient | void]
}>()
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
const loading = ref(false)
const client = ref<mqtt.MqttClient>()
const state = ref(false)
const list = ref<Config[]>([])
const activeKey = ref('')
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
async function handleConnect() {
  if (!activeKey.value) {
    ElMessage.error('请选择设备后再连接')
    return
  }
  if (
    !config.value.url ||
    !config.value.clientId ||
    !config.value.username ||
    !config.value.password
  ) {
    ElMessage.error('请填写完整连接信息')
    return
  }
  try {
    loading.value = true
    client.value = await mqtt.connectAsync(`${config.value.protocol}${config.value.url}`, {
      clientId: 'chx_' + config.value.clientId,
      username: config.value.username,
      password: config.value.password,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 2000,
      protocolVersion: 4,
      socksTimeout: 10000
    })
    const str = chain(list.value)
      .map((el) => {
        return {
          [el.clientId]: {
            protocol: el.protocol,
            url: el.url,
            friendName: el.friendName,
            password: encode(el.password)
          }
        }
      })
      .thru((obj) => Object.assign({}, ...obj))
      .thru(JSON.stringify)
      .value()
    localStorage.setItem('mqttDeviceList', str)
    ElMessage.success('连接成功')
  } catch (error) {
    ElMessage.error('连接失败')
    console.error(error)
  }
  loading.value = false
}
async function handleDisconnect() {
  await client.value?.endAsync()
  client.value = undefined
}
// ---------------------------- watch -------------------------------
watch(
  activeKey,
  (newVal) => {
    const item = list.value.find((i) => i.clientId === newVal)
    if (item) {
      console.log(item)

      Object.assign(config.value, item)
    }
  },
  { immediate: true }
)
watch(
  config,
  (cfg) => {
    const item = list.value.find((i) => i.clientId === cfg.clientId)
    console.log(cfg, item, 'xxx')
    if (item) {
      item.protocol = cfg.protocol
      item.url = cfg.url
      item.friendName = cfg.friendName
      item.password = cfg.password
    }
  },
  { deep: true }
)
watch(client, (c) => {
  emit('done', c)
})
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
    const storedStr = localStorage.getItem('mqttDeviceList')
    let storedObj: Record<string, Config> = {}
    if (storedStr) {
      try {
        storedObj = JSON.parse(storedStr)
      } catch (error) {
        console.error(error)
      }
    }

    list.value = chain(res.data)
      .map((item) => {
        const obj = storedObj[item._id] || {}
        console.log(obj)
        return {
          protocol: obj.protocol || 'wss://',
          url: obj.url,
          clientId: item._id,
          username: item.name,
          friendName: obj.friendName || item.name,
          password: obj.password ? decode(obj.password) : '',
          intro: item.intro,
          type: item.type
        }
      })
      .sortBy('type')
      .value()
    console.log(list.value)
  } catch (error) {
    console.error(error)
  }
})
// --------------------------- other --------------------------------
</script>

<template>
  <div class="connect-mqtt">
    <div class="connected-info" @click="state = true">
      当前连接：{{ client ? config.friendName : '未连接' }}
    </div>
    <AnimBox v-model="state" random class="anim-box">
      <div class="ttl-row">
        <span>设置</span>
        <el-button size="small" class="close-btn" text :icon="Close" @click="state = false" />
      </div>
      <div class="device-list">
        <el-select v-model="activeKey" placeholder="选择设备" style="width: 240px">
          <el-option
            v-for="item in list"
            :key="item.clientId"
            :value="item.clientId"
            :label="item.friendName"
            :disabled="item.type === 'device'"
          >
            <el-tooltip :content="`${item.username} - ${item.intro}`" placement="right">
              <span>{{ item.friendName }}</span>
            </el-tooltip>
          </el-option>
        </el-select>
      </div>
      <el-input v-model="config.friendName" placeholder="友好名称" />
      <el-input v-model="config.url" placeholder="url:port/path">
        <template #prepend>
          <el-select v-model="config.protocol" placeholder="Select" style="width: 90px">
            <el-option label="ws://" value="ws://" />
            <el-option label="wss://" value="wss://" />
          </el-select>
        </template>
      </el-input>
      <el-input v-model="config.clientId" placeholder="ClientId" disabled>
        <template #prepend><div style="width: 50px; text-align: center">chx_</div></template>
      </el-input>
      <el-input v-model="config.username" placeholder="Username" disabled />
      <el-input v-model="config.password" placeholder="Password" show-password />
      <el-button type="primary" :loading="loading" v-if="!client" @click="handleConnect"
        >连接</el-button
      >
      <el-button type="danger" v-else @click="handleDisconnect">断开</el-button>
    </AnimBox>
  </div>
</template>

<style lang="less" scoped>
.connect-mqtt {
  position: relative;
  .connected-info {
    margin-bottom: 12px;
    display: inline-block;
    cursor: pointer;
  }
  .device-list {
    display: flex;
  }
  .anim-box {
    position: absolute;
    z-index: 2;
    width: 480px;
    height: 332px;
    display: flex;
    gap: 8px;
    flex-direction: column;
    background: var(--el-color-info-light-7);
    box-shadow: 0 0 8px var(--el-color-info-light-9);
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
