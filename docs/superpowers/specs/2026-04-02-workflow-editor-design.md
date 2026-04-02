---
name: workflow-editor-design
description: VueFlow-based workflow editor with microkernel architecture
type: project
---

# 工作流编辑器设计规范

## 项目概述

设计一个基于 VueFlow 的工作流编辑器,采用微内核架构实现。核心系统仅提供流程控制节点(触发器、分支、循环、并行、结束),所有功能节点(HTTP请求、AI调用等)通过插件系统实现。插件配合浏览器插件实现跨域访问能力,配置使用 IndexedDB 存储,执行引擎在前端运行无需后端支持。

## Part 1: 整体架构

### 架构分层

```
[核心系统 - 微内核]
├─ VueFlow画布引擎
├─ 流程编排引擎(前端)
├─ Plugin管理器
└─ 持久化层

[内置节点 - 流程控制]
├─ Trigger节点
├─ Branch节点
├─ Loop节点
├─ Parallel节点
└─ End节点

[Plugin节点 - 扩展功能]
├─ HTTP Request Plugin
├─ AI Call Plugin
└─ Custom Plugins

[浏览器插件 - 跨域桥接]
└─ Chrome Extension
```

### 核心设计理念

**微内核架构**: 核心系统只负责流程编排,所有业务功能通过插件扩展,保持系统的灵活性和可维护性。

**前端执行引擎**: 工作流在前端直接执行,无需依赖后端服务,降低部署复杂度。

**跨域解决方案**: 通过 Chrome Extension 的 background script 代理 HTTP 请求,绕过 CORS 限制。

**插件生态**: 支持动态加载插件,插件定义自己的参数 Schema,前端根据 Schema 自动生成配置表单。

## Part 2: 核心数据结构

### Workflow 定义

```typescript
interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  trigger: TriggerConfig
  variables: Record<string, any>
  version: string
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}
```

### WorkflowNode 定义

```typescript
interface WorkflowNode {
  id: string
  type: 'trigger' | 'branch' | 'loop' | 'parallel' | 'end' | `plugin:${string}`
  position: { x: number, y: number }
  data: {
    label: string
    config: NodeConfig
    inputs: PortDefinition[]
    outputs: PortDefinition[]
  }
}

interface NodeConfig {
  [key: string]: any
}

interface PortDefinition {
  name: string
  type: 'data' | 'trigger' | 'condition'
  label: string
  required?: boolean
  multiple?: boolean
}
```

### WorkflowEdge 定义

```typescript
interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: 'default' | 'condition'
  data?: {
    condition?: string
    label?: string
  }
}
```

### PluginDefinition 定义

```typescript
interface PluginDefinition {
  id: string
  name: string
  version: string
  category: string
  description: string
  capabilities: {
    requiresCrossOrigin?: boolean
    requiresBrowserExtension?: boolean
    requiredPermissions?: string[]
  }
  paramsSchema: JSONSchema
  inputs: PortDefinition[]
  outputs: PortDefinition[]
  execute: string
}

interface JSONSchema {
  type: 'object'
  properties: Record<string, {
    type: string
    title: string
    description?: string
    default?: any
    enum?: any[]
    required?: boolean
  }>
}
```

### IndexedDB Schema

```typescript
interface WorkflowDatabase {
  name: 'CheryWorkflowDB'
  version: 1
  objectStores: {
    workflows: {
      keyPath: 'id'
      indexes: ['status', 'createdAt', 'updatedAt']
    }
    executions: {
      keyPath: 'id'
      indexes: ['workflowId', 'status', 'createdAt']
    }
    plugins: {
      keyPath: 'id'
      indexes: ['category', 'version']
    }
    extensionConfig: {
      keyPath: 'key'
    }
  }
}

interface ExecutionRecord {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: string
  endTime?: string
  logs: ExecutionLog[]
  context: {
    input: any
    output: any
    variables: Record<string, any>
  }
}

interface ExecutionLog {
  nodeId: string
  nodeName: string
  timestamp: string
  level: 'info' | 'error' | 'warning'
  message: string
  input?: any
  output?: any
  duration?: number
}
```

## Part 3: Plugin API 设计

### PluginInterface 接口

```typescript
interface PluginInterface {
  meta: PluginDefinition
  init(context: PluginContext): Promise<void>
  execute(input: any, params: Record<string, any>, context: ExecutionContext): Promise<PluginOutput>
  destroy?(): Promise<void>
}
```

### PluginContext 上下文

```typescript
interface PluginContext {
  extensionBridge?: ExtensionBridgeAPI
  db: IndexedDBAPI
  logger: LoggerAPI
  httpRequest: HTTPRequestAPI
}

interface ExtensionBridgeAPI {
  isAvailable(): boolean
  sendMessage(type: string, data: any): Promise<any>
}

interface IndexedDBAPI {
  get(store: string, key: string): Promise<any>
  put(store: string, data: any): Promise<void>
  delete(store: string, key: string): Promise<void>
  query(store: string, options?: QueryOptions): Promise<any[]>
}

interface LoggerAPI {
  info(message: string, data?: any): void
  error(message: string, error?: Error): void
  warning(message: string, data?: any): void
}

interface HTTPRequestAPI {
  request(config: RequestConfig): Promise<Response>
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

interface Response {
  status: number
  headers: Record<string, string>
  data: any
}
```

### ExecutionContext 执行上下文

```typescript
interface ExecutionContext {
  workflow: {
    id: string
    name: string
    variables: Record<string, any>
  }
  node: {
    id: string
    name: string
  }
  state: {
    isCancelled(): boolean
    updateProgress(progress: number): void
    log(message: string, data?: any): void
  }
  getVariable(name: string): any
  setVariable(name: string, value: any): void
}

interface PluginOutput {
  success: boolean
  data?: any
  error?: string
  shouldStop?: boolean
}
```

### PluginManager 插件管理器

```typescript
class PluginManager {
  private plugins: Map<string, PluginInterface> = new Map()

  async register(plugin: PluginInterface): Promise<void> {
    await plugin.init(this.createPluginContext(plugin))
    this.plugins.set(plugin.meta.id, plugin)
  }

  get(pluginId: string): PluginInterface | null {
    return this.plugins.get(pluginId) || null
  }

  list(filter?: { category?: string }): PluginDefinition[] {
    const all = Array.from(this.plugins.values()).map(p => p.meta)
    if (!filter) return all
    return all.filter(p => !filter.category || p.category === filter.category)
  }

  async loadPlugin(source: string | URL): Promise<void> {
    const module = await import(source)
    const plugin = module.default as PluginInterface
    await this.register(plugin)
  }

  private createPluginContext(plugin: PluginInterface): PluginContext {
    return {
      extensionBridge: this.createExtensionBridge(),
      db: this.createIndexedDBAPI(),
      logger: this.createLoggerAPI(),
      httpRequest: this.createHTTPRequestAPI(plugin)
    }
  }

  private createExtensionBridge(): ExtensionBridgeAPI {
    return {
      isAvailable: () => !!window.__CHERY_EXTENSION_BRIDGE__,
      sendMessage: async (type, data) => {
        if (!window.__CHERY_EXTENSION_BRIDGE__) {
          throw new Error('Extension bridge not available')
        }
        return window.__CHERY_EXTENSION_BRIDGE__.sendMessage(type, data)
      }
    }
  }
}
```

### HTTP Request Plugin 示例

```typescript
const HTTPRequestPlugin: PluginInterface = {
  meta: {
    id: 'http-request',
    name: 'HTTP Request',
    version: '1.0.0',
    category: 'network',
    description: 'Send HTTP requests to external APIs',
    capabilities: {
      requiresCrossOrigin: true,
      requiresBrowserExtension: true,
      requiredPermissions: ['<all_urls>']
    },
    paramsSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          title: 'Method',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'GET',
          required: true
        },
        url: {
          type: 'string',
          title: 'URL',
          description: 'Request URL',
          required: true
        },
        headers: {
          type: 'object',
          title: 'Headers',
          description: 'HTTP headers'
        },
        body: {
          type: 'any',
          title: 'Body',
          description: 'Request body'
        }
      }
    },
    inputs: [{ name: 'trigger', type: 'trigger', label: 'Trigger', required: true }],
    outputs: [
      { name: 'success', type: 'data', label: 'Success', required: true },
      { name: 'error', type: 'data', label: 'Error' }
    ]
  },

  init: async (context) => {
    if (!context.extensionBridge?.isAvailable()) {
      context.logger.warning('Browser extension not available, CORS requests may fail')
    }
  },

  execute: async (input, params, context) => {
    const { method, url, headers, body } = params

    context.state.log(`Sending ${method} request to ${url}`)

    try {
      const response = await context.httpRequest.request({
        method,
        url,
        headers,
        body,
        timeout: 30000
      })

      context.state.log(`Response received: status ${response.status}`)

      return {
        success: true,
        data: response
      }
    } catch (error) {
      context.state.log(`Request failed: ${error.message}`, { error })

      return {
        success: false,
        error: error.message
      }
    }
  }
}
```

## Part 4: 浏览器插件设计

### manifest.json (V3)

```json
{
  "manifest_version": 3,
  "name": "Chery Workflow Extension",
  "version": "1.0",
  "description": "Browser extension for Chery Workflow Editor to bypass CORS restrictions",
  "permissions": [
    "activeTab",
    "storage",
    "webRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_start"
    }
  ],
  "externally_connectable": {
    "matches": ["http://localhost:*/*", "https://*.xcherry.top/*"]
  }
}
```

### background/service-worker.js

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HTTP_REQUEST') {
    handleHTTPRequest(message.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true // Indicates async response
  }

  if (message.type === 'CHECK_AVAILABILITY') {
    sendResponse({ success: true, available: true })
    return false
  }
})

async function handleHTTPRequest(config: RequestConfig): Promise<Response> {
  const { method, url, headers, body, timeout } = config

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000)

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    const data = await response.json()

    return {
      status: response.status,
      headers: responseHeaders,
      data
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
```

### content/content-script.js

```typescript
window.__CHERY_EXTENSION_BRIDGE__ = {
  async sendMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, data }, resolve)
    })
  },

  checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CHECK_AVAILABILITY' }, (response) => {
        resolve(response?.available || false)
      })
    })
  }
}

// Notify page that extension is ready
window.postMessage({ type: 'CHERY_EXTENSION_READY' }, '*')
```

### Extension Integration in Frontend

```typescript
// src/utils/extension-bridge.ts
export class ExtensionBridge {
  private available: boolean = false

  async init(): Promise<void> {
    await this.checkAvailability()

    window.addEventListener('message', (event) => {
      if (event.data.type === 'CHERY_EXTENSION_READY') {
        this.available = true
      }
    })
  }

  private async checkAvailability(): Promise<void> {
    if (!window.__CHERY_EXTENSION_BRIDGE__) {
      this.available = false
      return
    }

    this.available = await window.__CHERY_EXTENSION_BRIDGE__.checkAvailability()
  }

  isAvailable(): boolean {
    return this.available && !!window.__CHERY_EXTENSION_BRIDGE__
  }

  async sendMessage(type: string, data: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Extension bridge not available')
    }

    return window.__CHERY_EXTENSION_BRIDGE__.sendMessage(type, data)
  }
}
```

## Part 5: 执行引擎设计

### DAGScheduler 类

```typescript
class DAGScheduler {
  private workflow: Workflow
  private executionRecord: ExecutionRecord
  private nodeOutputs: Map<string, any> = new Map()
  private cancelled: boolean = false

  constructor(workflow: Workflow) {
    this.workflow = workflow
    this.executionRecord = {
      id: nanoid(),
      workflowId: workflow.id,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: [],
      context: {
        input: {},
        output: {},
        variables: workflow.variables
      }
    }
  }

  async execute(): Promise<ExecutionResult> {
    // Find trigger node
    const triggerNode = this.workflow.nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      throw new Error('Workflow must have a trigger node')
    }

    // Execute workflow starting from trigger
    await this.executeNode(triggerNode.id, this.executionRecord)

    // Update execution record
    this.executionRecord.status = this.cancelled ? 'cancelled' : 'completed'
    this.executionRecord.endTime = new Date().toISOString()
    this.executionRecord.context.output = this.nodeOutputs.get('end')

    // Persist execution record to IndexedDB
    await this.saveExecutionRecord()

    return {
      success: !this.cancelled,
      data: this.executionRecord.context.output,
      executionId: this.executionRecord.id
    }
  }

  cancel(): void {
    this.cancelled = true
  }

  private async executeNode(nodeId: string, record: ExecutionRecord): Promise<void> {
    if (this.cancelled) return

    const node = this.workflow.nodes.find(n => n.id === nodeId)
    if (!node) return

    const startTime = Date.now()
    const nodeLog: ExecutionLog = {
      nodeId: node.id,
      nodeName: node.data.label,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Executing node: ${node.data.label}`
    }

    try {
      // Get input from upstream nodes
      const input = this.getNodeInput(nodeId)

      // Execute node logic
      const output = await this.executeNodeLogic(node, input, nodeLog)

      // Store output
      this.setNodeOutput(nodeId, output)

      // Update log
      nodeLog.input = input
      nodeLog.output = output
      nodeLog.duration = Date.now() - startTime
      nodeLog.message = `Node completed successfully`

      record.logs.push(nodeLog)

      // Execute downstream nodes
      await this.executeDownstreamNodes(nodeId, record)

    } catch (error) {
      nodeLog.level = 'error'
      nodeLog.message = `Node execution failed: ${error.message}`
      nodeLog.duration = Date.now() - startTime
      record.logs.push(nodeLog)

      throw error
    }
  }

  private async executeNodeLogic(node: WorkflowNode, input: any, log: ExecutionLog): Promise<any> {
    const params = node.data.config

    switch (node.type) {
      case 'trigger':
        return this.executeTriggerNode(node, input, params)

      case 'branch':
        return this.executeBranchNode(node, input, params)

      case 'loop':
        return this.executeLoopNode(node, input, params)

      case 'parallel':
        return this.executeParallelNode(node, input, params)

      case 'end':
        return this.executeEndNode(node, input, params)

      default:
        if (node.type.startsWith('plugin:')) {
          return this.executePluginNode(node, input, params)
        }
        throw new Error(`Unknown node type: ${node.type}`)
    }
  }

  private async executeTriggerNode(node: WorkflowNode, input: any, params: TriggerConfig): Promise<any> {
    log.message = `Trigger activated: ${params.type}`

    if (params.type === 'manual') {
      return { triggered: true, input: this.executionRecord.context.input }
    }

    if (params.type === 'webhook') {
      return { triggered: true, input: input || {} }
    }

    throw new Error(`Unsupported trigger type: ${params.type}`)
  }

  private async executeBranchNode(node: WorkflowNode, input: any, params: BranchConfig): Promise<any> {
    log.message = `Evaluating branch conditions`

    for (const condition of params.conditions) {
      const result = this.evaluateExpression(condition.expression, input)

      if (result) {
        log.message = `Condition matched: ${condition.label}`
        return {
          branch: condition.targetNode,
          matched: true,
          condition: condition.label
        }
      }
    }

    log.message = `No condition matched, using default branch`
    return {
      branch: params.defaultBranch,
      matched: false
    }
  }

  private async executeLoopNode(node: WorkflowNode, input: any, params: LoopConfig): Promise<any> {
    log.message = `Starting loop: ${params.iterations} iterations`

    const results = []
    const loopBody = params.bodyNodes

    for (let i = 0; i < params.iterations; i++) {
      if (this.cancelled) break

      log.message = `Loop iteration ${i + 1}`

      const iterationInput = { ...input, iteration: i, index: i }

      for (const bodyNodeId of loopBody) {
        const bodyOutput = await this.executeNodeLogic(
          this.workflow.nodes.find(n => n.id === bodyNodeId),
          iterationInput,
          log
        )
        results.push(bodyOutput)
      }
    }

    log.message = `Loop completed: ${results.length} iterations`
    return { results, iterations: params.iterations }
  }

  private async executeParallelNode(node: WorkflowNode, input: any, params: ParallelConfig): Promise<any> {
    log.message = `Executing ${params.parallelNodes.length} nodes in parallel`

    const promises = params.parallelNodes.map(async (nodeId) => {
      const parallelNode = this.workflow.nodes.find(n => n.id === nodeId)
      return this.executeNodeLogic(parallelNode, input, log)
    })

    const results = await Promise.all(promises)

    log.message = `Parallel execution completed`
    return { results }
  }

  private async executeEndNode(node: WorkflowNode, input: any, params: EndConfig): Promise<any> {
    log.message = `Workflow execution completed`

    this.executionRecord.context.output = params.outputValue || input
    return { end: true, output: params.outputValue || input }
  }

  private async executePluginNode(node: WorkflowNode, input: any, params: any): Promise<any> {
    const pluginId = node.type.replace('plugin:', '')
    const plugin = pluginManager.get(pluginId)

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }

    log.message = `Executing plugin: ${plugin.meta.name}`

    const executionContext = this.createExecutionContext(node, log)

    const result = await plugin.execute(input, params, executionContext)

    if (result.shouldStop) {
      this.cancelled = true
    }

    return result
  }

  private evaluateExpression(expression: string, context: any): any {
    // Safe expression evaluation
    const parsedExpr = expression.replace(/\$input/g, 'context.input')
                                     .replace(/\$vars/g, 'context.variables')

    const fn = new Function('context', `return ${parsedExpr}`)
    return fn(context)
  }

  private createExecutionContext(node: WorkflowNode, log: ExecutionLog): ExecutionContext {
    return {
      workflow: {
        id: this.workflow.id,
        name: this.workflow.name,
        variables: this.executionRecord.context.variables
      },
      node: {
        id: node.id,
        name: node.data.label
      },
      state: {
        isCancelled: () => this.cancelled,
        updateProgress: (progress) => log.message = `Progress: ${progress}%`,
        log: (message, data) => {
          log.message = message
          log.output = data
        }
      },
      getVariable: (name) => this.executionRecord.context.variables[name],
      setVariable: (name, value) => this.executionRecord.context.variables[name] = value
    }
  }

  private getNodeInput(nodeId: string): any {
    // Find upstream edges
    const upstreamEdges = this.workflow.edges.filter(e => e.target === nodeId)

    if (upstreamEdges.length === 0) return {}

    // Get outputs from upstream nodes
    const inputs = upstreamEdges.map(edge => {
      const sourceOutput = this.nodeOutputs.get(edge.source)
      return edge.sourceHandle ? sourceOutput[edge.sourceHandle] : sourceOutput
    })

    // Merge inputs
    return inputs.length === 1 ? inputs[0] : { inputs }
  }

  private setNodeOutput(nodeId: string, output: any): void {
    this.nodeOutputs.set(nodeId, output)
  }

  private async executeDownstreamNodes(nodeId: string, record: ExecutionRecord): Promise<void> {
    // Find downstream edges
    const downstreamEdges = this.workflow.edges.filter(e => e.source === nodeId)

    for (const edge of downstreamEdges) {
      if (this.cancelled) break

      // Check condition for branch edges
      if (edge.type === 'condition') {
        const nodeOutput = this.nodeOutputs.get(nodeId)
        if (nodeOutput.branch !== edge.target) continue
      }

      await this.executeNode(edge.target, record)
    }
  }

  private async saveExecutionRecord(): Promise<void> {
    const db = await openDB('CheryWorkflowDB', 1)
    await db.put('executions', this.executionRecord)
  }
}
```

### Node Configuration Types

```typescript
interface TriggerConfig {
  type: 'manual' | 'webhook' | 'schedule'
  webhookPath?: string
  scheduleConfig?: {
    cron: string
  }
}

interface BranchConfig {
  conditions: Array<{
    label: string
    expression: string
    targetNode: string
  }>
  defaultBranch: string
}

interface LoopConfig {
  iterations: number
  bodyNodes: string[]
}

interface ParallelConfig {
  parallelNodes: string[]
}

interface EndConfig {
  outputValue?: any
}
```

## Part 6: 前端 UI 设计

### 主页面布局

```vue
<!-- src/pages/main/workflow/index.vue -->
<template>
  <div class="workflow-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button-group>
        <el-button @click="saveWorkflow" :icon="DocumentSave">保存</el-button>
        <el-button @click="exportWorkflow" :icon="Download">导出</el-button>
        <el-button @click="importWorkflow" :icon="Upload">导入</el-button>
      </el-button-group>

      <el-button-group>
        <el-button @click="undo" :disabled="!canUndo" :icon="RefreshLeft">撤销</el-button>
        <el-button @click="redo" :disabled="!canRedo" :icon="RefreshRight">重做</el-button>
      </el-button-group>

      <el-button @click="clearCanvas" :icon="Delete">清空</el-button>

      <el-button @click="executeWorkflow" type="primary" :icon="VideoPlay">执行</el-button>
    </div>

    <!-- 画布区域 -->
    <div class="canvas-wrapper">
      <!-- 左侧节点面板 -->
      <div class="node-panel">
        <NodePanel
          :nodes="availableNodes"
          @drag-start="onNodeDragStart"
        />
      </div>

      <!-- VueFlow 画布 -->
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
      >
        <Background />
        <Controls />
        <MiniMap />

        <!-- 自定义节点模板 -->
        <template #node-trigger="nodeProps">
          <TriggerNode :data="nodeProps.data" />
        </template>

        <template #node-branch="nodeProps">
          <BranchNode :data="nodeProps.data" />
        </template>

        <template #node-loop="nodeProps">
          <LoopNode :data="nodeProps.data" />
        </template>

        <template #node-parallel="nodeProps">
          <ParallelNode :data="nodeProps.data" />
        </template>

        <template #node-end="nodeProps">
          <EndNode :data="nodeProps.data" />
        </template>

        <!-- Plugin节点动态渲染 -->
        <template v-for="plugin in pluginNodes" #[`node-plugin:${plugin.id}`]="nodeProps">
          <PluginNode
            :key="plugin.id"
            :data="nodeProps.data"
            :plugin="plugin"
          />
        </template>
      </VueFlow>

      <!-- 右侧配置面板 -->
      <div class="config-panel">
        <ConfigPanel
          v-if="selectedNode"
          :node="selectedNode"
          :schema="selectedNodeSchema"
          @update="onNodeConfigUpdate"
          @close="selectedNode = null"
        />

        <div v-else class="empty-panel">
          <el-empty description="点击节点查看配置" />
        </div>
      </div>
    </div>

    <!-- 执行结果面板 -->
    <ExecutionResultPanel
      v-if="executionResult"
      :result="executionResult"
      @close="executionResult = null"
    />
  </div>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { nanoid } from 'nanoid'
import { useVueFlowHistory } from '@/composables/useVueFlowHistory'

defineOptions({ name: 'WorkflowView' })

const { nodes, edges, addNodes, addEdges, removeNodes, removeEdges, fitView } = useVueFlow()
const { canUndo, canRedo, undo, redo } = useVueFlowHistory(nodes, edges)

const selectedNode = ref<WorkflowNode | null>(null)
const executionResult = ref<ExecutionResult | null>(null)

const availableNodes = computed(() => {
  // 内置节点
  const builtinNodes = [
    { type: 'trigger', label: '触发器', icon: 'CaretRight', description: '工作流触发入口' },
    { type: 'branch', label: '条件分支', icon: 'Share', description: '根据条件选择执行路径' },
    { type: 'loop', label: '循环', icon: 'Refresh', description: '重复执行节点' },
    { type: 'parallel', label: '并行', icon: 'Grid', description: '同时执行多个节点' },
    { type: 'end', label: '结束', icon: 'CircleClose', description: '工作流结束节点' }
  ]

  // Plugin节点
  const pluginNodes = pluginManager.list().map(p => ({
    type: `plugin:${p.id}`,
    label: p.name,
    icon: p.category === 'network' ? 'Link' : 'MagicStick',
    description: p.description
  }))

  return [
    { category: '流程控制', nodes: builtinNodes },
    { category: '插件节点', nodes: pluginNodes }
  ]
})

const selectedNodeSchema = computed(() => {
  if (!selectedNode.value) return null

  if (selectedNode.value.type.startsWith('plugin:')) {
    const pluginId = selectedNode.value.type.replace('plugin:', '')
    const plugin = pluginManager.get(pluginId)
    return plugin?.meta.paramsSchema || null
  }

  // 内置节点的Schema
  return getBuiltinNodeSchema(selectedNode.value.type)
})

function getBuiltinNodeSchema(type: string): JSONSchema | null {
  switch (type) {
    case 'trigger':
      return {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            title: '触发类型',
            enum: ['manual', 'webhook'],
            default: 'manual',
            required: true
          }
        }
      }

    case 'branch':
      return {
        type: 'object',
        properties: {
          conditions: {
            type: 'array',
            title: '条件列表',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', title: '条件名称' },
                expression: { type: 'string', title: '表达式' }
              }
            }
          }
        }
      }

    default:
      return null
  }
}

function onNodeDragStart(nodeType: string) {
  // 准备添加节点
}

function onNodeClick(event: NodeClickEvent) {
  selectedNode.value = event.node as WorkflowNode
}

function onNodeConfigUpdate(config: NodeConfig) {
  if (!selectedNode.value) return

  selectedNode.value.data.config = config
}

async function saveWorkflow() {
  const workflow: Workflow = {
    id: currentWorkflowId.value || nanoid(),
    name: workflowName.value,
    nodes: nodes.value as WorkflowNode[],
    edges: edges.value as WorkflowEdge[],
    trigger: { type: 'manual' },
    variables: {},
    version: '1.0',
    status: 'draft'
  }

  const db = await openDB('CheryWorkflowDB', 1)
  await db.put('workflows', workflow)

  ElMessage.success('工作流已保存')
}

async function executeWorkflow() {
  try {
    const workflow: Workflow = {
      id: currentWorkflowId.value || nanoid(),
      nodes: nodes.value as WorkflowNode[],
      edges: edges.value as WorkflowEdge[],
      trigger: { type: 'manual' },
      variables: {}
    }

    const scheduler = new DAGScheduler(workflow)
    const result = await scheduler.execute()

    executionResult.value = result

    if (result.success) {
      ElMessage.success('工作流执行成功')
    } else {
      ElMessage.warning('工作流执行已取消')
    }

  } catch (error) {
    ElMessage.error(`执行失败: ${error.message}`)
  }
}
</script>

<style scoped lang="less">
.workflow-container {
  @apply w-full h-full flex flex-col;

  .toolbar {
    @apply flex gap-4 p-4 border-b;
    height: 60px;
  }

  .canvas-wrapper {
    @apply flex flex-1;

    .node-panel {
      @apply border-r;
      width: 240px;
    }

    .config-panel {
      @apply border-l;
      width: 360px;
    }
  }
}
</style>
```

### NodePanel 组件

```vue
<!-- src/components/workflow/NodePanel.vue -->
<template>
  <div class="node-panel">
    <el-collapse v-model="activeCategories">
      <el-collapse-item
        v-for="group in nodes"
        :key="group.category"
        :title="group.category"
        :name="group.category"
      >
        <div class="node-list">
          <div
            v-for="node in group.nodes"
            :key="node.type"
            class="node-item"
            draggable="true"
            @dragstart="onDragStart($event, node.type)"
          >
            <el-icon :size="24">
              <component :is="node.icon" />
            </el-icon>
            <div class="node-info">
              <div class="label">{{ node.label }}</div>
              <div class="description">{{ node.description }}</div>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
interface Props {
  nodes: Array<{
    category: string
    nodes: Array<{
      type: string
      label: string
      icon: string
      description: string
    }>
  }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'drag-start', type: string): void
}>()

const activeCategories = ref(['流程控制'])

function onDragStart(event: DragEvent, nodeType: string) {
  event.dataTransfer.setData('nodeType', nodeType)
  emit('drag-start', nodeType)
}
</script>

<style scoped lang="less">
.node-panel {
  @apply p-4;

  .node-list {
    @apply flex flex-col gap-2;

    .node-item {
      @apply flex items-center gap-3 p-3 rounded cursor-move;
      border: 1px solid var(--el-border-color);
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
      }

      .node-info {
        @apply flex flex-col;

        .label {
          font-weight: 500;
        }

        .description {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }
  }
}
</style>
```

### ConfigPanel 组件

```vue
<!-- src/components/workflow/ConfigPanel.vue -->
<template>
  <div class="config-panel">
    <div class="header">
      <h3>{{ node.data.label }}</h3>
      <el-button @click="$emit('close')" :icon="Close" circle />
    </div>

    <div class="content">
      <!-- 动态表单生成 -->
      <el-form
        v-if="schema"
        :model="config"
        label-position="top"
      >
        <el-form-item
          v-for="(prop, key) in schema.properties"
          :key="key"
          :label="prop.title"
          :required="prop.required"
        >
          <!-- 字符串类型 -->
          <el-input
            v-if="prop.type === 'string' && !prop.enum"
            v-model="config[key]"
            :placeholder="prop.description"
          />

          <!-- 枚举类型 -->
          <el-select
            v-if="prop.enum"
            v-model="config[key]"
          >
            <el-option
              v-for="option in prop.enum"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>

          <!-- 数字类型 -->
          <el-input-number
            v-if="prop.type === 'number'"
            v-model="config[key]"
          />

          <!-- 对象类型 -->
          <el-input
            v-if="prop.type === 'object'"
            v-model="config[key]"
            type="textarea"
            :rows="3"
          />

          <!-- 数组类型 -->
          <ArrayEditor
            v-if="prop.type === 'array'"
            v-model="config[key]"
            :item-schema="prop.items"
          />
        </el-form-item>

        <el-button type="primary" @click="handleUpdate">更新配置</el-button>
      </el-form>

      <!-- 无Schema时的默认配置 -->
      <el-empty v-else description="该节点无需配置参数" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ArrayEditor from './ArrayEditor.vue'

interface Props {
  node: WorkflowNode
  schema: JSONSchema | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', config: NodeConfig): void
  (e: 'close'): void
}>()

const config = ref<NodeConfig>(props.node.data.config || {})

function handleUpdate() {
  emit('update', config.value)
}
</script>

<style scoped lang="less">
.config-panel {
  @apply flex flex-col h-full;

  .header {
    @apply flex items-center justify-between p-4 border-b;
  }

  .content {
    @apply flex-1 p-4 overflow-auto;
  }
}
</style>
```

### TriggerNode 自定义节点

```vue
<!-- src/components/workflow/nodes/TriggerNode.vue -->
<template>
  <div class="trigger-node">
    <Handle type="source" :position="Position.Right" />

    <div class="node-content">
      <el-icon :size="32" color="var(--el-color-success)">
        <CaretRight />
      </el-icon>
      <div class="label">{{ data.label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    config: TriggerConfig
  }
}

defineProps<Props>()
</script>

<style scoped lang="less">
.trigger-node {
  @apply flex items-center justify-center;
  width: 120px;
  height: 80px;
  background: var(--el-color-success-light-9);
  border: 2px solid var(--el-color-success);
  border-radius: 8px;

  .node-content {
    @apply flex flex-col items-center gap-2;

    .label {
      font-size: 14px;
      font-weight: 500;
    }
  }
}
</style>
```

### BranchNode 自定义节点

```vue
<!-- src/components/workflow/nodes/BranchNode.vue -->
<template>
  <div class="branch-node">
    <!-- 输入端口 -->
    <Handle type="target" :position="Position.Left" />

    <!-- 输出端口(动态) -->
    <Handle
      v-for="(condition, index) in data.config.conditions"
      :key="index"
      type="source"
      :position="Position.Right"
      :id="`condition-${index}`"
      :style="{ top: `${(index + 1) * 25}%` }"
    />

    <!-- 默认输出端口 -->
    <Handle type="source" :position="Position.Bottom" id="default" />

    <div class="node-content">
      <el-icon :size="32" color="var(--el-color-warning)">
        <Share />
      </el-icon>
      <div class="label">{{ data.label }}</div>
      <div class="branches">
        {{ data.config.conditions?.length || 0 }} 个分支
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    config: BranchConfig
  }
}

defineProps<Props>()
</script>

<style scoped lang="less">
.branch-node {
  @apply flex flex-col items-center justify-center;
  width: 160px;
  height: 100px;
  background: var(--el-color-warning-light-9);
  border: 2px solid var(--el-color-warning);
  border-radius: 8px;

  .node-content {
    @apply flex flex-col items-center gap-1;

    .label {
      font-size: 14px;
      font-weight: 500;
    }

    .branches {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
```

### PluginNode 动态节点

```vue
<!-- src/components/workflow/nodes/PluginNode.vue -->
<template>
  <div class="plugin-node">
    <!-- 动态输入端口 -->
    <Handle
      v-for="input in plugin.inputs"
      :key="input.name"
      type="target"
      :position="Position.Left"
      :id="input.name"
    />

    <!-- 动态输出端口 -->
    <Handle
      v-for="output in plugin.outputs"
      :key="output.name"
      type="source"
      :position="Position.Right"
      :id="output.name"
    />

    <div class="node-content">
      <el-icon :size="32" :color="getNodeColor(plugin.category)">
        <component :is="getNodeIcon(plugin.category)" />
      </el-icon>
      <div class="label">{{ data.label }}</div>
      <div class="plugin-name">{{ plugin.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    config: Record<string, any>
  }
  plugin: PluginDefinition
}

defineProps<Props>()

function getNodeColor(category: string): string {
  const colors: Record<string, string> = {
    network: 'var(--el-color-primary)',
    ai: 'var(--el-color-danger)',
    database: 'var(--el-color-info)'
  }
  return colors[category] || 'var(--el-color-primary)'
}

function getNodeIcon(category: string): string {
  const icons: Record<string, string> = {
    network: 'Link',
    ai: 'MagicStick',
    database: 'Coin'
  }
  return icons[category] || 'Connection'
}
</script>

<style scoped lang="less">
.plugin-node {
  @apply flex flex-col items-center justify-center;
  width: 180px;
  height: 100px;
  background: var(--el-color-primary-light-9);
  border: 2px solid var(--el-color-primary);
  border-radius: 8px;

  .node-content {
    @apply flex flex-col items-center gap-1;

    .label {
      font-size: 14px;
      font-weight: 500;
    }

    .plugin-name {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
```

## 技术栈详细说明

### VueFlow 集成

- **核心包**: `@vue-flow/core` - 提供画布引擎和节点管理
- **插件包**:
  - `@vue-flow/background` - 网格背景
  - `@vue-flow/controls` - 缩放/居中控制按钮
  - `@vue-flow/minimap` - 小地图预览
- **自定义节点**: 使用 `<template #node-{type}>` 定义节点模板
- **Handles**: 节点端口连接点,支持动态生成

### IndexedDB 操作

使用 `idb` 库简化 IndexedDB 操作:

```typescript
import { openDB } from 'idb'

const db = await openDB('CheryWorkflowDB', 1, {
  upgrade(db) {
    db.createObjectStore('workflows', { keyPath: 'id' })
    db.createObjectStore('executions', { keyPath: 'id' })
    db.createObjectStore('plugins', { keyPath: 'id' })
  }
})

// CRUD 操作
await db.put('workflows', workflow)
await db.get('workflows', workflowId)
await db.delete('workflows', workflowId)
```

### 插件动态加载

支持从 URL 动态加载插件:

```typescript
await pluginManager.loadPlugin('https://example.com/plugins/http-request.js')
await pluginManager.loadPlugin('/local/plugins/custom-plugin.js')
```

插件必须导出 `PluginInterface` 接口:

```javascript
// http-request-plugin.js
export default {
  meta: { ... },
  init: async (context) => { ... },
  execute: async (input, params, context) => { ... }
}
```

## 开发路线建议

### MVP 阶段(1-2周)

- VueFlow 画布基础(节点拖拽、连线)
- 3-5种基础节点类型(Trigger、Branch、Loop、End)
- 左侧节点面板 + 右侧配置面板
- 工具栏(保存、清空、撤销)
- localStorage 持久化

### 扩展阶段(2-3周)

- Plugin 系统实现
- HTTP Request Plugin(浏览器插件集成)
- IndexedDB 持久化
- 执行引擎核心(DAG调度)
- Branch/Loop节点执行逻辑

### 完整阶段(4-6周)

- Parallel节点
- AI Call Plugin
- 执行历史和日志查看
- 工作流导入/导出(JSON)
- 错误处理和重试机制

## 安全注意事项

### Chrome Extension 权限

- 使用最小权限原则
- `host_permissions` 可动态配置
- content script 仅注入到特定域名

### 插件执行隔离

- 插件执行在独立上下文中
- 插件无法直接访问 IndexedDB 其他 store
- 插件通过 PluginContext API 访问系统资源

### 表达式执行安全

```typescript
// Branch节点的表达式执行
// 使用Function构造器而非eval,限制作用域
const fn = new Function('context', `return ${parsedExpr}`)
return fn(context) // context是受限的执行上下文
```

## 性能优化

### 大型工作流优化

- 节点虚拟渲染(VueFlow内置)
- MiniMap 仅渲染节点位置而非完整节点
- 执行日志按需加载(分页查询IndexedDB)

### 插件加载优化

- 懒加载: 仅在首次使用时加载插件代码
- 插件缓存: 已加载插件缓存在内存中
- Schema缓存: PluginDefinition缓存在IndexedDB

### 执行引擎优化

- Parallel节点并行执行
- Loop节点批量处理
- 变量更新最小化(避免深拷贝)

## 测试策略

### 单元测试

- PluginManager 插件注册/加载
- DAGScheduler 节点执行逻辑
- IndexedDB CRUD操作
- ExtensionBridge 通信

### 集成测试

- VueFlow 画布交互
- 节点连线/配置/执行完整流程
- 浏览器插件与前端通信

### E2E测试

- 工作流创建/保存/执行完整流程
- HTTP Request Plugin实际网络请求
- 浏览器插件实际安装测试

## 部署方案

### 前端应用

- 构建输出: Vite build → dist/
- 部署到静态服务器(Nginx/CDN)
- 无需后端API支持

### Chrome Extension

- 构建输出: extension/build/
- Chrome开发者模式加载
- 后续可发布到Chrome Web Store

### 插件资源

- 插件代码托管在CDN
- 支持本地插件(项目目录内)
- 插件版本管理(IndexedDB)

## 后续扩展方向

### 插件生态

- 官方插件库(数据库、消息队列、AI等)
- 第三方插件市场
- 插件版本管理

### 协作功能

- 工作流分享(JSON导出)
- 工作流模板库
- 插件推荐系统

### 高级功能

- 工作流调试器(逐步执行)
- 性能监控(节点执行时间分析)
- 变量追踪(数据流可视化)

---

**设计完成日期**: 2026-04-02
**设计者**: Claude Code (基于用户需求)