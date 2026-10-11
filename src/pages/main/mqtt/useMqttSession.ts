import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import mqtt from 'mqtt'
import type { IClientOptions, MqttClient } from 'mqtt'

export type QoS = 0 | 1 | 2

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
export interface ConnectionConfig {
  protocol: string
  url: string
  clientId: string
  username: string
  password: string
  friendName: string
}
export interface Subscription {
  topic: string
  qos: QoS
  active: boolean
}
export interface ReceivedMessage {
  id: number
  topic: string
  payload: string
  time: string
  qos: QoS
  retain: boolean
  bytes: number
  truncated: boolean
}

export function topicError(topic: string) {
  if (!topic.trim()) return '请输入要订阅的主题'
  if (topic.includes('\0') || new TextEncoder().encode(topic).length > 65535)
    return '主题包含无效字符或长度超出限制'
  const levels = topic.split('/')
  if (
    levels.some(
      (level, i) =>
        (level.includes('#') && (level !== '#' || i !== levels.length - 1)) ||
        (level.includes('+') && level !== '+')
    )
  )
    return '+ 必须独占一级，# 必须独占最后一级'
  return ''
}

/** One session per cached MQTT workspace; transport objects stay outside Vue's deep proxy. */
export function useMqttSession(
  createClient: (url: string, options: IClientOptions) => MqttClient = mqtt.connect
) {
  const client = shallowRef<MqttClient>()
  const state = ref<ConnectionState>('idle')
  const error = ref('')
  const activeConfig = shallowRef<ConnectionConfig>()
  const subscriptions = ref<Subscription[]>([])
  const pendingTopics = ref(new Set<string>())
  const messages = shallowRef<ReceivedMessage[]>([])
  const received = ref(0)
  const receivedBytes = ref(0)
  const connectedAt = ref<number>()
  const connected = computed(() => state.value === 'connected')
  const busy = computed(() => state.value === 'connecting' || state.value === 'reconnecting')
  let epoch = 0
  let sequence = 0
  let deadline: ReturnType<typeof setTimeout> | undefined
  let controller = new AbortController()

  function clearDeadline() {
    clearTimeout(deadline)
    deadline = undefined
  }

  function disconnect() {
    epoch++
    controller.abort()
    clearDeadline()
    const previous = client.value
    client.value = undefined
    previous?.end(true)
    state.value = 'idle'
    connectedAt.value = undefined
    subscriptions.value = subscriptions.value.map((item) => ({ ...item, active: false }))
    pendingTopics.value = new Set()
  }

  function fail(message: string) {
    disconnect()
    error.value = message
    state.value = 'error'
  }

  function request<T>(promise: Promise<T>): Promise<T> {
    const signal = controller.signal
    return new Promise((resolve, reject) => {
      const abort = () => finish(new Error('连接已关闭'))
      const timer = setTimeout(() => {
        // Close an unacknowledged session so late SUBACKs cannot create invisible subscriptions.
        fail('服务端响应超时，连接已断开，请重新连接后重试')
        finish(new Error('请求超时'))
      }, 8000)
      function finish(reason?: unknown, value?: T) {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        if (reason) reject(reason)
        else resolve(value as T)
      }
      signal.addEventListener('abort', abort, { once: true })
      promise.then(
        (value) => finish(undefined, value),
        (reason: unknown) => finish(reason)
      )
      if (signal.aborted) abort()
    })
  }

  async function subscribe(topic: string, qos: QoS) {
    const validation = topicError(topic)
    if (validation) {
      error.value = validation
      return false
    }
    const current = client.value
    if (!current || !connected.value || pendingTopics.value.has(topic)) return false
    const version = epoch
    const operation = controller
    const isCurrent = () => version === epoch && operation === controller
    pendingTopics.value.add(topic)
    error.value = ''
    try {
      const grants = await request(current.subscribeAsync(topic, { qos }))
      if (!isCurrent()) return false
      const grant = grants.find((item) => item.topic === topic)
      if (!grant || grant.qos > 2) throw new Error('服务端拒绝了该主题的订阅，请检查权限')
      const record = { topic, qos: grant.qos as QoS, active: true }
      const index = subscriptions.value.findIndex((item) => item.topic === topic)
      if (index < 0) subscriptions.value.push(record)
      else subscriptions.value[index] = record
      return true
    } catch (reason) {
      if (isCurrent()) error.value = reason instanceof Error ? reason.message : '订阅失败'
      return false
    } finally {
      if (isCurrent()) pendingTopics.value.delete(topic)
    }
  }

  async function unsubscribe(topic: string) {
    if (pendingTopics.value.has(topic)) return
    const current = client.value
    if (!current || !connected.value) return
    const version = epoch
    const operation = controller
    const isCurrent = () => version === epoch && operation === controller
    pendingTopics.value.add(topic)
    error.value = ''
    try {
      await request(current.unsubscribeAsync(topic))
      if (isCurrent())
        subscriptions.value = subscriptions.value.filter((item) => item.topic !== topic)
    } catch (reason) {
      if (isCurrent()) error.value = reason instanceof Error ? reason.message : '取消订阅失败'
    } finally {
      if (isCurrent()) pendingTopics.value.delete(topic)
    }
  }

  function connect(config: ConnectionConfig) {
    disconnect()
    controller = new AbortController()
    error.value = ''
    if (
      activeConfig.value?.clientId !== config.clientId ||
      activeConfig.value?.url !== config.url ||
      activeConfig.value?.protocol !== config.protocol
    ) {
      subscriptions.value = []
      clearMessages()
    }
    activeConfig.value = { ...config }
    state.value = 'connecting'
    const version = epoch
    const isCurrent = () => version === epoch
    try {
      const current = createClient(`${config.protocol}${config.url}`, {
        clientId: `chx_${config.clientId}`,
        username: config.username,
        password: config.password,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 2000,
        protocolVersion: 4,
        resubscribe: false
      })
      client.value = current
      const armDeadline = () => {
        if (!deadline)
          deadline = setTimeout(() => {
            if (isCurrent()) fail('连接超时，请检查服务地址、网络和凭据后重试')
          }, 10000)
      }
      armDeadline()
      current.on('connect', () => {
        if (!isCurrent()) return
        clearDeadline()
        state.value = 'connected'
        connectedAt.value = Date.now()
        error.value = ''
        for (const item of subscriptions.value) void subscribe(item.topic, item.qos)
      })
      current.on('reconnect', () => {
        if (!isCurrent()) return
        state.value = 'reconnecting'
        armDeadline()
      })
      current.on('close', () => {
        if (!isCurrent()) return
        controller.abort()
        controller = new AbortController()
        pendingTopics.value = new Set()
        state.value = 'reconnecting'
        connectedAt.value = undefined
        subscriptions.value = subscriptions.value.map((item) => ({ ...item, active: false }))
        armDeadline()
      })
      current.on('error', (reason) => {
        if (isCurrent()) fail(`连接失败：${reason.message}`)
      })
      current.on('message', (topic, payload, packet) => {
        if (!isCurrent()) return
        received.value++
        receivedBytes.value += payload.byteLength
        messages.value = [
          ...messages.value.slice(-299),
          {
            id: ++sequence,
            topic,
            payload: new TextDecoder().decode(payload.subarray(0, 16384)),
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            qos: packet.qos,
            retain: packet.retain,
            bytes: payload.byteLength,
            truncated: payload.byteLength > 16384
          }
        ]
      })
    } catch (reason) {
      fail(reason instanceof Error ? reason.message : '无法创建 MQTT 连接')
    }
  }

  function clearMessages() {
    messages.value = []
    received.value = 0
    receivedBytes.value = 0
  }

  onScopeDispose(disconnect)
  return {
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
  }
}
