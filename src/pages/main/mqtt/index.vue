<script setup lang="ts">
import { ElIcon } from 'element-plus'
import 'element-plus/es/components/icon/style/css'
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { Connection, Share, Download, Timer } from '@element-plus/icons-vue'
import Connect from './connect.vue'
import Subscribe from './subscribe.vue'
import MessageMonitor from './MessageMonitor.vue'
import { useMqttSession } from './useMqttSession'

defineOptions({ name: 'MQTTView' })
const {
  state,
  error,
  activeConfig,
  subscriptions,
  pendingTopics,
  messages,
  received,
  receivedBytes,
  connectedAt,
  connected,
  busy,
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  clearMessages
} = useMqttSession()
const labels = {
  idle: '未连接',
  connecting: '正在连接',
  connected: '已连接',
  reconnecting: '正在重连',
  error: '连接失败'
}
const activeCount = computed(() => subscriptions.value.filter((item) => item.active).length)
const now = ref(Date.now())
const keyboardInteraction = ref(false)
let clock: ReturnType<typeof setInterval> | undefined
const duration = computed(() => {
  if (!connectedAt.value) return '—'
  const seconds = Math.max(0, Math.floor((now.value - connectedAt.value) / 1000))
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})
const traffic = computed(() =>
  receivedBytes.value < 1024
    ? `${receivedBytes.value} B`
    : `${(receivedBytes.value / 1024).toFixed(1)} KB`
)
function startClock() {
  now.value = Date.now()
  clearInterval(clock)
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
}
function stopClock() {
  clearInterval(clock)
}
onMounted(startClock)
onActivated(startClock)
onDeactivated(stopClock)
onUnmounted(stopClock)
const motion = new WeakMap<Element, Animation>()
function wiggle(event: PointerEvent, leaving = false) {
  if (
    event.pointerType !== 'mouse' ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return
  const glyph = (event.currentTarget as HTMLElement).querySelector('.metric-icon')
  if (!glyph) return
  const initial = getComputedStyle(glyph).transform
  motion.get(glyph)?.cancel()
  const direction = leaving ? -1 : 1
  motion.set(
    glyph,
    glyph.animate(
      [
        { transform: initial === 'none' ? 'rotate(0deg)' : initial },
        { transform: `rotate(${direction * 9}deg) translateY(-2px)` },
        { transform: `rotate(${-direction * 4}deg)` },
        { transform: 'rotate(0deg)' }
      ],
      { duration: 250, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    )
  )
}
</script>

<template>
  <main
    class="mqtt-workspace"
    :class="{
      'is-busy': busy,
      'is-online': connected,
      'keyboard-interaction': keyboardInteraction
    }"
    @keydown.capture="keyboardInteraction = true"
    @pointerdown.capture="keyboardInteraction = false"
  >
    <header class="workspace-header mqtt-enter">
      <div>
        <div class="workspace-kicker">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>IOT WORKSPACE<span
            class="version-label"
            >MQTT 3.1.1</span
          >
        </div>
        <h1>设备连接，<span>实时可见。</span></h1>
        <p>连接你的设备，订阅数据，让每一条消息有迹可循。</p>
      </div>
      <div class="connection-status" :class="state" role="status">
        <span class="status-orbit"><i></i></span>
        <div>
          <Transition name="mqtt-status" mode="out-in"
            ><strong :key="state">{{ labels[state] }}</strong></Transition
          ><span>{{
            connected
              ? activeConfig?.friendName
              : busy
                ? '正在与服务端建立会话'
                : '选择设备，开启调试'
          }}</span>
        </div>
        <span class="status-protocol">{{ activeConfig?.protocol === 'ws://' ? 'WS' : 'WSS' }}</span>
      </div>
    </header>
    <div class="workspace-metrics mqtt-enter">
      <div class="metric" @pointerenter="wiggle($event)" @pointerleave="wiggle($event, true)">
        <span class="metric-icon"
          ><el-icon><Connection /></el-icon
        ></span>
        <div>
          <span class="metric-label">连接状态</span
          ><strong :class="{ 'text-online': connected }">{{ labels[state] }}</strong>
        </div>
        <span class="metric-index">01</span>
      </div>
      <div class="metric" @pointerenter="wiggle($event)" @pointerleave="wiggle($event, true)">
        <span class="metric-icon"
          ><el-icon><Share /></el-icon
        ></span>
        <div>
          <span class="metric-label">活跃订阅</span
          ><strong>{{ String(activeCount).padStart(2, '0') }}<small>个主题</small></strong>
        </div>
        <span class="metric-index">02</span>
      </div>
      <div class="metric" @pointerenter="wiggle($event)" @pointerleave="wiggle($event, true)">
        <span class="metric-icon"
          ><el-icon><Download /></el-icon
        ></span>
        <div>
          <span class="metric-label">接收消息</span
          ><strong
            >{{ received.toLocaleString() }}<small>{{ traffic }}</small></strong
          >
        </div>
        <span class="metric-index">03</span>
      </div>
      <div class="metric" @pointerenter="wiggle($event)" @pointerleave="wiggle($event, true)">
        <span class="metric-icon"
          ><el-icon><Timer /></el-icon
        ></span>
        <div>
          <span class="metric-label">在线时长</span
          ><strong class="duration-value">{{ duration }}</strong>
        </div>
        <span class="metric-index">04</span>
      </div>
    </div>
    <Transition name="mqtt-feedback"
      ><div v-if="error" class="session-error" role="alert">
        <span><strong>操作提示</strong>{{ error }}</span
        ><button type="button" class="text-action" aria-label="关闭错误提示" @click="error = ''">
          关闭
        </button>
      </div></Transition
    >
    <div class="workspace-grid">
      <div class="connection-column mqtt-enter">
        <Connect :state="state" @connect="connect" @disconnect="disconnect" />
      </div>
      <div class="data-column mqtt-enter">
        <Subscribe
          :connected="connected"
          :subscriptions="subscriptions"
          :pending="pendingTopics"
          :subscribe="subscribe"
          @unsubscribe="unsubscribe"
        /><MessageMonitor
          :key="`${activeConfig?.protocol}/${activeConfig?.url}/${activeConfig?.clientId}`"
          :messages="messages"
          :connected="connected"
          :has-subscriptions="activeCount > 0"
          @clear="clearMessages"
        />
      </div>
    </div>
    <footer class="workspace-footer">
      <span
        ><i class="mini-dot" :class="{ online: connected }"></i
        >{{ connected ? '会话进行中 · 切换标签页会保持连接' : '准备就绪，等待建立连接' }}</span
      ><span>WEBSOCKET / MQTT</span>
    </footer>
  </main>
</template>

<style src="./workspace.css"></style>
