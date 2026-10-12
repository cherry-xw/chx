<script setup lang="ts">
import { ElButton, ElCollapseTransition, ElIcon, ElInput, ElOption, ElSelect } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/collapse-transition/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/select/style/css'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Connection, Refresh, ArrowDown, Lock, Cpu } from '@element-plus/icons-vue'
import { requestDeviceList, type DeviceListResponse } from '@/api/devices'
import { decode, encode } from '@/utils/common'
import type { ConnectionConfig, ConnectionState } from './useMqttSession'

defineOptions({ name: 'MqttConnectionPanel' })

interface Device extends ConnectionConfig {
  intro: string
  type: string
}
const props = defineProps<{ state: ConnectionState }>()
const emit = defineEmits<{ connect: [config: ConnectionConfig]; disconnect: [] }>()
const devices = ref<Device[]>([])
const selected = ref('')
const loading = ref(false)
const loadError = ref('')
const formError = ref('')
const credentialsOpen = ref(true)
const form = ref<ConnectionConfig>({
  protocol: 'wss://',
  url: '',
  clientId: '',
  username: '',
  password: '',
  friendName: ''
})
const locked = computed(() => ['connecting', 'connected', 'reconnecting'].includes(props.state))
const selectedDevice = computed(() =>
  devices.value.find((item) => item.clientId === selected.value)
)
const usableCount = computed(() => devices.value.filter((item) => item.type !== 'device').length)
const formElement = ref<HTMLFormElement>()
let cancelDeviceRequest: (() => void) | undefined
let feedbackMotion: Animation | undefined
const keyboardInteraction = ref(false)

async function loadDevices() {
  if (loading.value || locked.value) return
  loading.value = true
  loadError.value = ''
  const request = requestDeviceList()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const response = await Promise.race([
      request.sync,
      new Promise<DeviceListResponse>((_, reject) => {
        cancelDeviceRequest = () => {
          request.abort()
          reject(new Error('设备列表请求已取消'))
        }
        timer = setTimeout(cancelDeviceRequest, 10000)
      })
    ])
    if (!Array.isArray(response?.data)) throw new Error('未获取到设备列表')
    let saved: Record<string, Partial<ConnectionConfig>> = {}
    try {
      const value: unknown = JSON.parse(localStorage.getItem('mqttDeviceList') || '{}')
      if (value && typeof value === 'object' && !Array.isArray(value)) saved = value as typeof saved
    } catch {
      /* Device discovery remains usable without local storage. */
    }
    devices.value = response.data
      .map((item) => {
        const cached = saved[item._id] || {}
        let password = ''
        try {
          if (typeof cached.password === 'string') password = decode(cached.password)
        } catch {
          /* Re-enter an invalid saved password. */
        }
        return {
          clientId: item._id,
          username: item.name,
          intro: item.intro,
          type: item.type,
          protocol: cached.protocol === 'ws://' ? 'ws://' : 'wss://',
          url: typeof cached.url === 'string' ? cached.url : '',
          friendName: typeof cached.friendName === 'string' ? cached.friendName : item.name,
          password
        }
      })
      .sort((a, b) => a.type.localeCompare(b.type))
    if (!devices.value.some((item) => item.clientId === selected.value)) selected.value = ''
  } catch {
    loadError.value = '设备列表加载失败，请确认登录状态后重试。'
  } finally {
    clearTimeout(timer)
    cancelDeviceRequest = undefined
    loading.value = false
  }
}
watch(selected, (_, previous) => {
  const previousDevice = devices.value.find((item) => item.clientId === previous)
  if (previousDevice) Object.assign(previousDevice, form.value)
  if (selectedDevice.value) form.value = { ...selectedDevice.value }
  formError.value = ''
})
watch(
  () => props.state,
  (value, previous) => {
    if (value !== 'connected' || previous === 'connected') return
    const device = selectedDevice.value
    if (device) Object.assign(device, form.value)
    try {
      localStorage.setItem(
        'mqttDeviceList',
        JSON.stringify(
          Object.fromEntries(
            devices.value.map((item) => [
              item.clientId,
              {
                protocol: item.protocol,
                url: item.url,
                friendName: item.friendName,
                password: encode(item.password)
              }
            ])
          )
        )
      )
    } catch {
      formError.value = '已连接，但浏览器无法保存本次配置。'
    }
  }
)
function submit() {
  formError.value = ''
  if (!selected.value) formError.value = '请先选择一个客户端设备'
  else if (!form.value.url.trim() || !form.value.password)
    formError.value = '请填写服务地址和访问密码'
  else {
    try {
      const address = new URL(`${form.value.protocol}${form.value.url.trim()}`)
      if (
        !address.hostname ||
        address.username ||
        address.password ||
        address.hash ||
        form.value.url.includes('://')
      )
        throw new Error()
      if (window.location.protocol === 'https:' && address.protocol === 'ws:') {
        formError.value = '当前页面使用 HTTPS，请选择 WSS 安全连接'
      }
    } catch {
      formError.value = '请输入有效地址，例如 broker.example.com:8084/mqtt'
    }
  }
  if (formError.value) {
    if (
      !keyboardInteraction.value &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      feedbackMotion?.cancel()
      feedbackMotion = formElement.value?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(3px)' },
          { transform: 'translateX(0)' }
        ],
        { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      )
    }
    return
  }
  emit('connect', { ...form.value, url: form.value.url.trim() })
}
onMounted(loadDevices)
onUnmounted(() => {
  cancelDeviceRequest?.()
  feedbackMotion?.cancel()
})
</script>

<template>
  <section class="mqtt-panel connection-panel" aria-labelledby="connection-title">
    <header class="panel-heading">
      <div class="heading-with-icon">
        <span class="panel-icon"
          ><el-icon><Connection /></el-icon
        ></span>
        <div>
          <span class="eyebrow">CONNECTION</span>
          <h2 id="connection-title">连接设备</h2>
        </div>
      </div>
      <el-button
        text
        circle
        :icon="Refresh"
        :loading="loading"
        :disabled="locked"
        aria-label="刷新设备列表"
        title="刷新设备列表"
        @click="loadDevices"
      />
    </header>
    <form
      ref="formElement"
      class="connection-form"
      @submit.prevent="submit"
      @keydown.capture="keyboardInteraction = true"
      @pointerdown.capture="keyboardInteraction = false"
    >
      <div class="field">
        <label for="mqtt-device"
          >客户端设备 <span>{{ usableCount }} 个可用</span></label
        >
        <el-select
          id="mqtt-device"
          popper-class="mqtt-device-menu"
          v-model="selected"
          filterable
          placeholder="选择一个客户端"
          :loading="loading"
          :disabled="locked || loading"
          aria-describedby="device-hint"
        >
          <el-option
            v-for="device in devices"
            :key="device.clientId"
            :label="device.friendName"
            :value="device.clientId"
            :disabled="device.type === 'device'"
          >
            <span>{{ device.friendName }}</span
            ><span class="option-note">{{
              device.type === 'device' ? '设备端 · 不可选' : '客户端'
            }}</span>
          </el-option>
        </el-select>
        <p v-if="loadError" id="device-hint" class="field-error" role="alert">
          {{ loadError }}
          <button class="text-action" type="button" @click="loadDevices">重试</button>
        </p>
        <p v-else-if="!loading && !usableCount" id="device-hint" class="field-hint">
          暂无可用客户端，请先在设备管理中配置。
        </p>
        <p v-else id="device-hint" class="field-hint">
          {{ selectedDevice?.intro || '选择已有设备，载入它的连接配置。' }}
        </p>
      </div>
      <div class="device-identity" :class="{ selected: !!selected }">
        <el-icon><Cpu /></el-icon>
        <div>
          <strong>{{ form.friendName || '等待选择设备' }}</strong
          ><span>{{ selected ? `chx_${form.clientId}` : '设备信息将在这里显示' }}</span>
        </div>
        <i class="mini-dot" :class="{ online: state === 'connected' }"></i>
      </div>
      <div class="field">
        <label for="mqtt-name">显示名称</label
        ><el-input
          id="mqtt-name"
          v-model="form.friendName"
          placeholder="为连接起一个容易辨认的名字"
          :disabled="!selected || locked"
        />
      </div>
      <div class="field">
        <label for="mqtt-address">服务地址 <span>WebSocket</span></label>
        <div class="address-input">
          <el-select v-model="form.protocol" :disabled="locked" aria-label="连接协议"
            ><el-option label="wss://" value="wss://" /><el-option
              label="ws://"
              value="ws://" /></el-select
          ><el-input
            id="mqtt-address"
            v-model="form.url"
            placeholder="broker.example.com:8084/mqtt"
            :disabled="!selected || locked"
          />
        </div>
      </div>
      <button
        type="button"
        class="credentials-toggle"
        :aria-expanded="credentialsOpen"
        aria-controls="mqtt-credentials"
        @click="credentialsOpen = !credentialsOpen"
      >
        <span
          ><el-icon><Lock /></el-icon>身份凭据</span
        ><el-icon :class="{ expanded: credentialsOpen }"><ArrowDown /></el-icon>
      </button>
      <el-collapse-transition
        ><div v-show="credentialsOpen" id="mqtt-credentials" class="credentials-fields">
          <div class="field">
            <label for="mqtt-client">Client ID</label
            ><el-input
              id="mqtt-client"
              :model-value="selected ? `chx_${form.clientId}` : ''"
              placeholder="由设备自动生成"
              readonly
            />
          </div>
          <div class="field">
            <label for="mqtt-user">用户名</label
            ><el-input
              id="mqtt-user"
              :model-value="form.username"
              placeholder="由设备自动填入"
              readonly
              autocomplete="username"
            />
          </div>
          <div class="field">
            <label for="mqtt-password">访问密码</label
            ><el-input
              id="mqtt-password"
              v-model="form.password"
              placeholder="输入设备访问密码"
              type="password"
              show-password
              :disabled="!selected || locked"
              autocomplete="current-password"
            />
          </div></div
      ></el-collapse-transition>
      <Transition name="mqtt-feedback"
        ><p v-if="formError" class="field-error" role="alert">{{ formError }}</p></Transition
      >
      <el-button
        v-if="!locked"
        class="connect-action"
        type="primary"
        native-type="submit"
        :icon="Connection"
        :disabled="loading || !usableCount"
        >建立连接 <span class="button-arrow">↗</span></el-button
      >
      <el-button
        v-else
        class="connect-action"
        :type="state === 'connected' ? 'danger' : 'default'"
        plain
        @click="emit('disconnect')"
        >{{ state === 'connected' ? '断开连接' : '取消连接' }}</el-button
      >
      <p class="connection-footnote">
        <el-icon><Lock /></el-icon>{{ form.protocol === 'wss://' ? 'WSS 加密传输' : 'WS 明文传输'
        }}<span>MQTT 3.1.1</span>
      </p>
    </form>
  </section>
</template>
