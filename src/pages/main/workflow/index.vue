<template>
  <div class="workflow-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="saveWorkflow">保存</el-button>
      <el-button @click="clearWorkflow">清空</el-button>
      <el-button @click="undoFn" :disabled="!canUndo">撤销</el-button>
      <el-button @click="redoFn" :disabled="!canRedo">重做</el-button>
    </div>

    <div class="editor-container">
      <!-- 左侧面板：节点选择 -->
      <div class="node-panel">
        <h3>节点面板</h3>
        <div
          v-for="nodeType in nodeTypes"
          :key="nodeType.type"
          class="node-item"
          draggable="true"
          @dragstart="onDragStart($event, nodeType)"
        >
          {{ nodeType.label }}
        </div>
      </div>

      <!-- 中间画布 -->
      <div class="canvas-container" @dragover="onDragOver" @drop="onDrop">
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          :fit-view-on-init="true"
          :pan-on-scroll="true"
          :zoom-on-scroll="true"
          :prevent-scrolling="true"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
        >
          <template #background>
            <Background />
          </template>
          <template #controls>
            <Controls />
          </template>
          <template #minimap>
            <MiniMap />
          </template>
        </VueFlow>
      </div>

      <!-- 右侧面板：配置 -->
      <div class="config-panel">
        <h3>配置面板</h3>
        <div v-if="selectedNode">
          <h4>{{ selectedNode.label || selectedNode.type }}</h4>
          <el-form label-position="top">
            <el-form-item label="节点ID">
              <el-input v-model="selectedNode.id" disabled />
            </el-form-item>
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.label" />
            </el-form-item>
            <el-form-item label="节点类型">
              <el-select v-model="selectedNode.type" disabled>
                <el-option
                  v-for="nodeType in nodeTypes"
                  :key="nodeType.type"
                  :label="nodeType.label"
                  :value="nodeType.type"
                />
              </el-select>
            </el-form-item>
            <!-- 动态配置表单 -->
            <component
              :is="getConfigComponent(selectedNode.type)"
              v-if="getConfigComponent(selectedNode.type)"
              :node="selectedNode"
              @update="onNodeUpdate"
            />
          </el-form>
        </div>
        <div v-else>
          <p>请选择一个节点进行配置</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import type { NodeMouseEvent, EdgeMouseEvent } from '@vue-flow/core'
import {
  VueFlow,
  useVueFlow
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
// Import VueFlow base styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { useWorkflowStore } from '@/stores/workflow'
import { useNodeConfig } from '@/composables/useNodeConfig'
import { useVueFlowHistory } from '@/composables/useVueFlowHistory'

defineOptions({ name: 'WorkflowEditor' })

interface NodeType {
  type: string
  label: string
  icon?: string
  color?: string
}

const nodeTypes: NodeType[] = [
  { type: 'trigger', label: '触发器节点', color: '#10b981' },
  { type: 'branch', label: '分支节点', color: '#f59e0b' },
  { type: 'loop', label: '循环节点', color: '#8b5cf6' },
  { type: 'parallel', label: '并行节点', color: '#06b6d4' },
  { type: 'end', label: '结束节点', color: '#ef4444' }
]

// 初始化 Vue Flow
const flowInstance = useVueFlow()

// 解构实例属性
const { nodes, edges, addNodes, removeNodes, removeEdges } = flowInstance

// 工作流状态管理
const workflowStore = useWorkflowStore()

// 拖放状态
const dragOver = ref(false)

// 选中的节点
const selectedNode = ref<any>(null)

// 节点配置相关的 Composable
const { getConfigComponent } = useNodeConfig()

// Integrate useVueFlowHistory for undo/redo functionality
const { canUndo, canRedo, undo: undoFn, redo: redoFn } = useVueFlowHistory(nodes, edges)

// 初始化数据
onMounted(() => {
  // 从 store 加载现有工作流数据
  if (workflowStore.currentWorkflowId) {
    // Load the workflow from the store
    workflowStore.loadWorkflow(workflowStore.currentWorkflowId)
  }

  // 适应视图
  nextTick(() => {
    setTimeout(() => {
      flowInstance.fitView()
    }, 100)
  })
})

// 节点拖拽开始事件
const onDragStart = (event: DragEvent, nodeType: NodeType) => {
  event.dataTransfer?.setData('application/vueflow', nodeType.type)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}

// 拖拽进入画布
const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  dragOver.value = true
}

// 拖拽放置事件
const onDrop = (event: DragEvent) => {
  event.preventDefault()
  dragOver.value = false

  const nodeType = event.dataTransfer?.getData('application/vueflow') || ''

  // 检查是否是有效的节点类型
  if (!nodeType || !nodeTypes.some(nt => nt.type === nodeType)) {
    return
  }

  // 获取画布上的坐标（相对于画布）
  // 简单处理：将屏幕坐标转换为画布坐标
  const position = { x: event.clientX - 100, y: event.clientY - 100 }

  // 创建新节点
  const newNode: any = {
    id: `node_${Date.now()}`,
    type: nodeType,
    position,
    data: {
      label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
      config: getDefaultNodeConfig(nodeType),
      inputs: [],
      outputs: [],
      extensions: []
    }
  }

  // 添加节点到 store
  workflowStore.addNode(newNode)

  // 添加节点到画布
  addNodes([newNode])

  // 选中这个节点
  selectedNode.value = newNode
}

// 获取默认节点配置
const getDefaultNodeConfig = (nodeType: string) => {
  switch (nodeType) {
    case 'trigger':
      return { triggerType: 'manual' }
    case 'branch':
      return { condition: '' }
    case 'loop':
      return { collection: '', iterator: '' }
    case 'parallel':
      return { paths: [] }
    case 'end':
      return { status: 'completed' }
    default:
      return {}
  }
}

// 节点点击事件
const onNodeClick = (event: NodeMouseEvent) => {
  const node = event.node as any
  selectedNode.value = node
  workflowStore.selectNode(node)
}

// 边点击事件
const onEdgeClick = (event: EdgeMouseEvent) => {
  // 选中边的逻辑
  console.log('Edge clicked:', event.edge)
}

// 画布空白处点击
const onPaneClick = () => {
  // 清除选中状态
  selectedNode.value = null
  workflowStore.selectNode(null)
}

// 保存工作流
const saveWorkflow = () => {
  // Save to store
  workflowStore.saveWorkflow()
  console.log('Workflow saved to store')
}

// 清空工作流
const clearWorkflow = () => {
  // 获取所有节点和边的ID
  const nodeIds = nodes.value.map((n: any) => n.id)
  const edgeIds = edges.value.map((e: any) => e.id)

  removeNodes(nodeIds)
  removeEdges(edgeIds)
  selectedNode.value = null
  workflowStore.selectNode(null)
}

// 节点更新事件
const onNodeUpdate = (updatedNode: any) => {
  // 更新节点数据到 store
  workflowStore.updateNode(updatedNode.id, updatedNode)

  // 保持对当前选中节点的引用
  if (selectedNode.value && selectedNode.value.id === updatedNode.id) {
    selectedNode.value = updatedNode
  }
}
</script>

<style scoped>
.workflow-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 10px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f5f7fa;
  display: flex;
  gap: 10px;
  align-items: center;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.node-panel {
  width: 200px;
  border-right: 1px solid #e4e7ed;
  padding: 15px;
  background-color: #fafafa;
  overflow-y: auto;
}

.node-item {
  padding: 10px;
  margin-bottom: 8px;
  background-color: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s;
}

.node-item:hover {
  background-color: #ecf5ff;
  border-color: #409eff;
  box-shadow: 0 0 5px rgba(64, 158, 255, 0.3);
}

.canvas-container {
  flex: 1;
  position: relative;
  background-color: #f8f9fa;
}

.canvas-container.drag-over {
  outline: 2px dashed #409eff;
  outline-offset: -2px;
}

.config-panel {
  width: 300px;
  border-left: 1px solid #e4e7ed;
  padding: 15px;
  background-color: #fafafa;
  overflow-y: auto;
}

.config-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
}

.config-panel h4 {
  margin-top: 0;
  color: #606266;
}

.config-panel p {
  color: #909399;
  font-style: italic;
}

/* Vue Flow 特定样式 */
.vue-flow__pane {
  cursor: grab;
}

.vue-flow__pane.active {
  cursor: grabbing;
}

.vue-flow__handle {
  width: 8px;
  height: 8px;
  background: #555;
}

.vue-flow__node {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-width: 120px;
}

.vue-flow__node.trigger {
  border-color: #10b981;
}

.vue-flow__node.branch {
  border-color: #f59e0b;
}

.vue-flow__node.loop {
  border-color: #8b5cf6;
}

.vue-flow__node.parallel {
  border-color: #06b6d4;
}

.vue-flow__node.end {
  border-color: #ef4444;
}

.vue-flow__edge {
  stroke: #9ca3af;
  stroke-width: 2px;
}
</style>