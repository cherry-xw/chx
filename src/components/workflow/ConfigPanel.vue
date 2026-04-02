<template>
  <div class="config-panel">
    <h3>{{ node?.label || '配置面板' }}</h3>

    <el-form v-if="node && schema" :model="localConfig" label-width="100px">
      <template v-for="field in schema.fields" :key="field.name">
        <el-form-item :label="field.label">
          <el-input
            v-if="field.type === 'string'"
            v-model="localConfig[field.name]"
            :placeholder="field.placeholder"
          />
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="localConfig[field.name]"
            :min="field.min"
            :max="field.max"
          />
          <el-switch
            v-else-if="field.type === 'boolean'"
            v-model="localConfig[field.name]"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="localConfig[field.name]"
            :placeholder="field.placeholder"
          >
            <el-option
              v-for="option in field.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <component
            v-else-if="field.component"
            :is="field.component"
            v-model="localConfig[field.name]"
            v-bind="field.props"
          />
          <ArrayEditor
            v-else-if="field.type === 'array'"
            v-model="localConfig[field.name]"
            :item-schema="field.itemSchema"
          />
        </el-form-item>
      </template>
    </el-form>

    <!-- 节点扩展配置 -->
    <div class="expand-config">
      <h4>节点扩展配置</h4>

      <el-form :model="localOptions" label-width="120px">
        <el-form-item label="重试次数">
          <el-input-number v-model="localOptions.retryCount" :min="0" :max="10" />
        </el-form-item>

        <el-form-item label="启用监控">
          <el-switch v-model="localOptions.enableMonitor" />
        </el-form-item>

        <el-form-item label="超时时间(ms)">
          <el-input-number v-model="localOptions.timeout" :min="0" />
        </el-form-item>

        <el-form-item label="错误处理策略">
          <el-select v-model="localOptions.errorStrategy">
            <el-option label="跳过" value="skip" />
            <el-option label="终止" value="terminate" />
            <el-option label="重试" value="retry" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="panel-actions">
      <el-button @click="emit('close')">关闭</el-button>
      <el-button type="primary" @click="saveConfig">保存</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import ArrayEditor from './ArrayEditor.vue'

interface FieldSchema {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'array'
  placeholder?: string
  min?: number
  max?: number
  options?: { label: string; value: any }[]
  component?: any
  props?: Record<string, any>
  itemSchema?: any
}

interface NodeSchema {
  fields: FieldSchema[]
}

interface WorkflowNode {
  name: string
  label: string
  type: string
  config: Record<string, any>
  options: {
    retryCount: number
    enableMonitor: boolean
    timeout: number
    errorStrategy: 'skip' | 'terminate' | 'retry'
  }
}

interface Props {
  node?: WorkflowNode
  schema?: NodeSchema
}

interface Emits {
  (e: 'update', node: WorkflowNode): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 创建本地响应式数据以避免直接修改props
const localConfig = ref<Record<string, any>>({})
const localOptions = ref<{
  retryCount: number
  enableMonitor: boolean
  timeout: number
  errorStrategy: 'skip' | 'terminate' | 'retry'
}>({
  retryCount: 0,
  enableMonitor: false,
  timeout: 0,
  errorStrategy: 'skip'
})

// 当node发生变化时，同步到本地数据
watch(() => props.node, (newNode) => {
  if (newNode) {
    localConfig.value = { ...newNode.config }
    localOptions.value = { ...newNode.options }
  }
}, { deep: true, immediate: true })

const saveConfig = () => {
  if (props.node) {
    const updatedNode = {
      ...props.node,
      config: { ...localConfig.value },
      options: { ...localOptions.value }
    }
    emit('update', updatedNode)
  }
}
</script>

<style scoped>
.config-panel {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.expand-config {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.panel-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>