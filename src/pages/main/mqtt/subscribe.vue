<script setup lang="ts">
import { ElButton, ElIcon, ElInput, ElOption, ElSelect } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/select/style/css'
import { computed, ref } from 'vue'
import { Plus, Close, Share } from '@element-plus/icons-vue'
import { topicError, type Subscription, type QoS } from './useMqttSession'

defineOptions({ name: 'MqttSubscriptionPanel' })
const props = defineProps<{
  connected: boolean
  subscriptions: Subscription[]
  pending: Set<string>
  subscribe: (topic: string, qos: QoS) => Promise<boolean>
}>()
const emit = defineEmits<{ unsubscribe: [topic: string] }>()
const topic = ref('')
const qos = ref<QoS>(0)
const validation = ref('')
const activeCount = computed(() => props.subscriptions.filter((item) => item.active).length)
async function submit() {
  validation.value = topicError(topic.value)
  if (validation.value) return
  if (props.subscriptions.some((item) => item.topic === topic.value && item.active)) {
    validation.value = '该主题已经在订阅列表中'
    return
  }
  const submitted = topic.value
  if (await props.subscribe(submitted, qos.value)) {
    if (topic.value === submitted) topic.value = ''
  }
}
</script>
<template>
  <section class="mqtt-panel subscriptions-panel" aria-labelledby="subscriptions-title">
    <header class="panel-heading">
      <div class="heading-with-icon">
        <span class="panel-icon"
          ><el-icon><Share /></el-icon
        ></span>
        <div>
          <span class="eyebrow">SUBSCRIPTIONS</span>
          <h2 id="subscriptions-title">
            主题订阅 <span class="count-badge">{{ activeCount }}</span>
          </h2>
        </div>
      </div>
      <span class="quiet-label">{{ connected ? '支持 + / # 通配符' : '连接后可订阅' }}</span>
    </header>
    <form class="subscription-form" @submit.prevent="submit">
      <div class="topic-input">
        <label class="sr-only" for="mqtt-topic">订阅主题</label
        ><el-input
          id="mqtt-topic"
          v-model="topic"
          placeholder="例如 sensors/+/temperature"
          :disabled="!connected"
          @input="validation = ''"
          ><template #prefix><span class="topic-slash">/</span></template></el-input
        >
      </div>
      <el-select v-model="qos" aria-label="订阅 QoS" :disabled="!connected"
        ><el-option v-for="level in [0, 1, 2]" :key="level" :label="`QoS ${level}`" :value="level"
      /></el-select>
      <el-button
        type="primary"
        native-type="submit"
        :icon="Plus"
        :disabled="!connected"
        :loading="pending.has(topic)"
        >订阅</el-button
      >
    </form>
    <p v-if="validation" class="field-error" role="alert">{{ validation }}</p>
    <TransitionGroup
      v-if="subscriptions.length"
      name="mqtt-topic"
      tag="ul"
      class="subscription-list"
    >
      <li v-for="item in subscriptions" :key="item.topic" class="subscription-row">
        <i class="mini-dot" :class="{ online: item.active }"></i><code>{{ item.topic }}</code
        ><span class="qos-label">QoS {{ item.qos }}</span
        ><span class="quiet-label">{{ item.active ? '已订阅' : '待恢复' }}</span
        ><el-button
          text
          circle
          :icon="Close"
          :loading="pending.has(item.topic)"
          :disabled="!connected"
          :aria-label="`取消订阅 ${item.topic}`"
          title="取消订阅"
          @click="emit('unsubscribe', item.topic)"
        />
      </li>
    </TransitionGroup>
    <div v-else class="subscription-empty">
      <span class="empty-line"></span>
      <p>{{ connected ? '添加一个主题，开始接收设备消息' : '建立连接后，订阅你关心的设备主题' }}</p>
      <span class="empty-line"></span>
    </div>
  </section>
</template>
