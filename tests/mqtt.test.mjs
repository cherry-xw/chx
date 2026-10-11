import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { effectScope } from 'vue'
import { topicError, useMqttSession } from '../src/pages/main/mqtt/useMqttSession.ts'

const config = {
  protocol: 'wss://',
  url: 'broker.example.test/mqtt',
  clientId: 'test-client',
  username: 'test',
  password: 'test',
  friendName: '测试设备'
}
class FakeClient extends EventEmitter {
  ended = false
  subscriptions = []
  unsubscribed = []
  grant = 1
  async subscribeAsync(topic, options) {
    this.subscriptions.push({ topic, ...options })
    return [{ topic, qos: this.grant }]
  }
  async unsubscribeAsync(topic) {
    this.unsubscribed.push(topic)
  }
  end(force) {
    this.ended = force
    this.emit('close')
  }
}
function setup(t) {
  const clients = []
  const options = []
  const scope = effectScope()
  const session = scope.run(() =>
    useMqttSession((url, opts) => {
      options.push({ url, ...opts })
      const client = new FakeClient()
      clients.push(client)
      return client
    })
  )
  t.after(() => scope.stop())
  const open = () => {
    session.connect(config)
    const client = clients.at(-1)
    client.emit('connect')
    return client
  }
  return { session, clients, options, open, scope }
}
const tick = () => new Promise((resolve) => setImmediate(resolve))

test('MQTT topic validation enforces wildcard levels and encoded length', () => {
  for (const topic of ['sensors/+/temperature', 'devices/#', '#', '/a', '中文/温度'])
    assert.equal(topicError(topic), '')
  for (const topic of ['', '  ', 'a/#/b', 'a+/', 'a/#b', 'a\0b', '中'.repeat(22000)])
    assert.notEqual(topicError(topic), '')
})
test('cancel stops transport and stale events cannot revive a session', (t) => {
  const { session, clients, options } = setup(t)
  session.connect(config)
  assert.equal(session.state.value, 'connecting')
  assert.equal(options[0].clientId, 'chx_test-client')
  assert.equal(options[0].resubscribe, false)
  session.disconnect()
  clients[0].emit('connect')
  clients[0].emit('error', new Error('late error'))
  assert.equal(clients[0].ended, true)
  assert.equal(session.state.value, 'idle')
  assert.equal(session.connected.value, false)
})
test('subscriptions require broker acknowledgement; rejection never produces active UI', async (t) => {
  const { session, open } = setup(t)
  assert.equal(await session.subscribe('a', 0), false)
  const client = open()
  client.grant = 128
  assert.equal(await session.subscribe('a', 1), false)
  assert.equal(session.subscriptions.value.length, 0)
  assert.match(session.error.value, /拒绝/)
  client.grant = 1
  assert.equal(await session.subscribe('a', 1), true)
  assert.deepEqual(session.subscriptions.value, [{ topic: 'a', qos: 1, active: true }])
  await session.unsubscribe('a')
  assert.deepEqual(client.unsubscribed, ['a'])
  assert.equal(session.subscriptions.value.length, 0)
})
test('network loss marks subscriptions inactive and restores them after reconnect', async (t) => {
  const { session, open } = setup(t)
  const client = open()
  await session.subscribe('sensor/+', 1)
  client.emit('close')
  assert.equal(session.state.value, 'reconnecting')
  assert.equal(session.subscriptions.value[0].active, false)
  client.emit('connect')
  await tick()
  assert.equal(session.connected.value, true)
  assert.equal(session.subscriptions.value[0].active, true)
  assert.equal(client.subscriptions.length, 2)
})
test('cancelled pending requests cannot alter a replacement connection', async (t) => {
  const { session, open, clients } = setup(t)
  const first = open()
  let acknowledge
  first.subscribeAsync = () =>
    new Promise((resolve) => {
      acknowledge = resolve
    })
  const pending = session.subscribe('pending', 1)
  session.disconnect()
  open()
  acknowledge([{ topic: 'pending', qos: 1 }])
  assert.equal(await pending, false)
  assert.equal(session.subscriptions.value.length, 0)
  assert.equal(session.state.value, 'connected')
  assert.equal(clients.length, 2)
})
test('close and immediate reconnect cannot apply a stale subscription response', async (t) => {
  const { session, open } = setup(t)
  const client = open()
  let acknowledge
  client.subscribeAsync = () =>
    new Promise((resolve) => {
      acknowledge = resolve
    })
  const pending = session.subscribe('pending', 0)
  client.emit('close')
  client.emit('connect')
  acknowledge([{ topic: 'pending', qos: 0 }])
  assert.equal(await pending, false)
  assert.equal(session.subscriptions.value.length, 0)
  assert.equal(session.error.value, '')
})
test('message history bounds memory and preserves accurate counts and packet metadata', (t) => {
  const { session, open } = setup(t)
  const client = open()
  for (let i = 0; i < 305; i++)
    client.emit('message', 'sensor/temp', Buffer.from('23'), { qos: 1, retain: true })
  assert.equal(session.messages.value.length, 300)
  assert.equal(session.received.value, 305)
  assert.equal(session.receivedBytes.value, 610)
  assert.equal(session.messages.value[0].id, 6)
  assert.equal(session.messages.value[0].retain, true)
  client.emit('message', 'large', Buffer.alloc(20000, 65), { qos: 0, retain: false })
  assert.equal(session.messages.value.at(-1).payload.length, 16384)
  assert.equal(session.messages.value.at(-1).bytes, 20000)
  assert.equal(session.messages.value.at(-1).truncated, true)
  session.clearMessages()
  assert.equal(session.messages.value.length, 0)
  assert.equal(session.received.value, 0)
})
test('changing device clears previous topics and messages', async (t) => {
  const { session, open } = setup(t)
  const client = open()
  await session.subscribe('private/device-1', 1)
  client.emit('message', 'private/device-1', Buffer.from('hello'), { qos: 0, retain: false })
  session.connect({ ...config, clientId: 'device-2' })
  assert.equal(session.subscriptions.value.length, 0)
  assert.equal(session.messages.value.length, 0)
  assert.equal(client.ended, true)
})
test('connection deadline exits loading state and closes transport', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { session, clients } = setup(t)
  session.connect(config)
  t.mock.timers.tick(10000)
  assert.equal(session.state.value, 'error')
  assert.equal(session.busy.value, false)
  assert.equal(clients[0].ended, true)
  assert.match(session.error.value, /超时/)
})
test('scope disposal closes a live session', (t) => {
  const { scope, open } = setup(t)
  const client = open()
  scope.stop()
  assert.equal(client.ended, true)
})

test('unacknowledged subscription times out and late acknowledgement cannot create a hidden subscription', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { session, open } = setup(t)
  const client = open()
  let acknowledge
  client.subscribeAsync = () =>
    new Promise((resolve) => {
      acknowledge = resolve
    })
  const pending = session.subscribe('silent-broker', 1)
  t.mock.timers.tick(8000)
  assert.equal(await pending, false)
  acknowledge([{ topic: 'silent-broker', qos: 1 }])
  await Promise.resolve()
  assert.equal(client.ended, true)
  assert.equal(session.state.value, 'error')
  assert.equal(session.pendingTopics.value.size, 0)
  assert.equal(session.subscriptions.value.length, 0)
})
