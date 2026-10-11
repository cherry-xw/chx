<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import {
  Search,
  Delete,
  VideoPause,
  VideoPlay,
  CopyDocument,
  Monitor
} from '@element-plus/icons-vue'
import type { ReceivedMessage } from './useMqttSession'
const props = defineProps<{
  messages: ReceivedMessage[]
  connected: boolean
  hasSubscriptions: boolean
}>()
const emit = defineEmits<{ clear: [] }>()
const filter = ref('')
const paused = ref(false)
const frozen = shallowRef<ReceivedMessage[]>([])
const formatJSON = ref(true)
const selectedId = ref<number>()
const listElement = ref<HTMLElement>()
const copied = ref(false)
const copyError = ref('')
const follow = ref(true)
const visible = computed(() =>
  (paused.value ? frozen.value : props.messages).filter((message) => {
    const needle = filter.value.toLowerCase()
    return (
      message.topic.toLowerCase().includes(needle) || message.payload.toLowerCase().includes(needle)
    )
  })
)
const selected = computed(() => visible.value.find((item) => item.id === selectedId.value))
const pendingCount = computed(() =>
  paused.value
    ? props.messages.filter((item) => item.id > (frozen.value.at(-1)?.id ?? 0)).length
    : 0
)
const body = computed(() => {
  if (!selected.value) return ''
  if (formatJSON.value && !selected.value.truncated) {
    try {
      return JSON.stringify(JSON.parse(selected.value.payload), null, 2)
    } catch {
      /* Plain text and binary payloads stay readable. */
    }
  }
  return selected.value.payload
})
function togglePause() {
  if (!paused.value) frozen.value = [...props.messages]
  paused.value = !paused.value
}
function onScroll() {
  const element = listElement.value
  if (element) follow.value = element.scrollHeight - element.scrollTop - element.clientHeight < 32
}
async function scrollToLatest() {
  follow.value = true
  await nextTick()
  listElement.value?.scrollTo({ top: listElement.value.scrollHeight })
}
watch(
  () => props.messages.at(-1)?.id,
  () => {
    if (!paused.value && follow.value) void scrollToLatest()
  }
)
watch(visible, (items) => {
  if (!items.some((item) => item.id === selectedId.value)) selectedId.value = undefined
})
watch(selectedId, () => {
  copied.value = false
  copyError.value = ''
})
async function copy() {
  try {
    await navigator.clipboard.writeText(body.value)
    copied.value = true
  } catch {
    copyError.value = '复制失败，可选中报文手动复制'
  }
}
function clear() {
  frozen.value = []
  selectedId.value = undefined
  emit('clear')
}
</script>
<template>
  <section
    class="mqtt-panel monitor-panel"
    :class="{ 'has-selection': !!selected }"
    aria-labelledby="monitor-title"
  >
    <header class="panel-heading">
      <div class="heading-with-icon">
        <span class="panel-icon"
          ><el-icon><Monitor /></el-icon
        ></span>
        <div>
          <span class="eyebrow">LIVE MESSAGES</span>
          <h2 id="monitor-title">消息监视器</h2>
        </div>
      </div>
      <span class="monitor-live" :class="{ receiving: connected && hasSubscriptions && !paused }"
        ><i class="mini-dot"></i
        >{{ paused ? '显示已暂停' : connected && hasSubscriptions ? '正在监听' : '等待数据' }}</span
      >
    </header>
    <div class="monitor-toolbar">
      <el-input
        v-model="filter"
        :prefix-icon="Search"
        clearable
        placeholder="筛选主题或消息内容"
        aria-label="筛选消息"
      />
      <div class="monitor-actions">
        <el-button
          :icon="paused ? VideoPlay : VideoPause"
          :aria-pressed="paused"
          @click="togglePause"
          >{{ paused ? `继续${pendingCount ? ` · ${pendingCount}` : ''}` : '暂停显示' }}</el-button
        ><el-button
          :icon="Delete"
          :disabled="!messages.length && !frozen.length"
          aria-label="清空消息"
          title="清空消息"
          @click="clear"
        />
      </div>
    </div>
    <div class="monitor-table-heading" aria-hidden="true">
      <span>时间</span><span>主题 / 报文预览</span><span>QoS</span>
    </div>
    <div ref="listElement" class="message-list" @scroll="onScroll">
      <template v-if="visible.length"
        ><button
          v-for="message in visible"
          :key="message.id"
          type="button"
          class="message-row"
          :class="{ selected: selectedId === message.id }"
          :aria-pressed="selectedId === message.id"
          @click="selectedId = selectedId === message.id ? undefined : message.id"
        >
          <time>{{ message.time }}</time
          ><span class="message-summary"
            ><strong>{{ message.topic }}</strong
            ><span>{{ message.payload || '(空报文)' }}</span></span
          ><span class="qos-label">{{ message.qos }}<small v-if="message.retain">R</small></span>
        </button></template
      >
      <div v-else class="monitor-empty">
        <div
          class="signal-illustration"
          :class="{ listening: connected && hasSubscriptions }"
          aria-hidden="true"
        >
          <span class="signal-ring ring-outer"></span><span class="signal-ring ring-inner"></span
          ><span class="signal-core"
            ><el-icon><Monitor /></el-icon></span
          ><i class="signal-node node-one"></i><i class="signal-node node-two"></i
          ><i class="signal-node node-three"></i>
        </div>
        <h3>
          {{
            filter
              ? '没有匹配的消息'
              : paused
                ? '消息显示已暂停'
                : !connected
                  ? '让设备的每一次响应，都清晰可见'
                  : !hasSubscriptions
                    ? '连接已就绪，添加你的第一个主题'
                    : '正在等待第一条消息'
          }}
        </h3>
        <p>
          {{
            filter
              ? '试试其他关键词，或清除筛选条件。'
              : paused
                ? '继续显示即可查看接收到的新消息。'
                : !connected
                  ? '从左侧选择设备并建立连接，然后订阅一个主题。'
                  : !hasSubscriptions
                    ? '支持精确主题，也可以使用 + 或 # 监听多个设备。'
                    : '设备发布消息后，这里会实时显示主题和报文。'
          }}
        </p>
        <div v-if="!filter && !paused" class="empty-path">
          <span :class="{ complete: connected }">01 连接设备</span><span>→</span
          ><span :class="{ complete: hasSubscriptions }">02 订阅主题</span><span>→</span
          ><span>03 查看消息</span>
        </div>
      </div>
    </div>
    <Transition name="mqtt-detail"
      ><div v-if="selected" class="message-detail">
        <div class="detail-heading">
          <div>
            <span class="eyebrow">PAYLOAD</span><code>{{ selected.topic }}</code>
          </div>
          <div>
            <el-switch v-model="formatJSON" active-text="JSON" aria-label="格式化 JSON" /><el-button
              text
              :icon="CopyDocument"
              @click="copy"
              >{{ copied ? '已复制' : '复制' }}</el-button
            ><el-button text @click="selectedId = undefined">收起</el-button>
          </div>
        </div>
        <pre tabindex="0">{{ body || '(空报文)' }}</pre>
        <p v-if="selected.truncated" class="field-hint">
          报文共 {{ selected.bytes }} 字节，仅显示前 16 KB。
        </p>
        <p v-if="copyError" class="field-error" role="status">{{ copyError }}</p>
      </div></Transition
    >
    <footer class="monitor-footer">
      <span
        >{{ visible.length }} 条{{ filter ? '匹配消息' : '消息'
        }}<span class="footer-divider">/</span>保留最近 300 条</span
      ><button v-if="!follow && !paused" class="text-action" @click="scrollToLatest">
        回到最新 ↓</button
      ><span v-else>{{ paused ? '连接继续接收，仅暂停显示' : '点击消息查看完整报文' }}</span>
    </footer>
  </section>
</template>
