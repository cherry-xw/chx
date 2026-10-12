<template>
  <div class="array-editor">
    <div v-for="(item, index) in modelValue" :key="index" class="array-item">
      <el-input
        v-if="itemSchema.type === 'string'"
        :model-value="modelValue[index]"
        :placeholder="itemSchema.placeholder || ''"
        @update:model-value="(val: string) => updateItem(index, val)"
      />
      <el-input-number
        v-else-if="itemSchema.type === 'number'"
        :model-value="modelValue[index]"
        :min="itemSchema.min"
        :max="itemSchema.max"
        @update:model-value="(val: number | undefined) => updateItem(index, val)"
      />
      <el-switch
        v-else-if="itemSchema.type === 'boolean'"
        :model-value="modelValue[index]"
        @update:model-value="(val: string | number | boolean) => updateItem(index, val)"
      />
      <component
        v-else-if="itemSchema.component"
        :is="itemSchema.component"
        :model-value="modelValue[index]"
        v-bind="itemSchema.props"
        @update:model-value="(val: any) => updateItem(index, val)"
      />
      <el-button
        type="danger"
        size="small"
        @click="removeItem(index)"
        class="remove-btn"
      >
        删除
      </el-button>
    </div>
    <el-button type="primary" size="small" @click="addItem">
      添加项
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElButton, ElInput, ElInputNumber, ElSwitch } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/switch/style/css'
interface ItemSchema {
  type?: 'string' | 'number' | 'boolean'
  placeholder?: string
  min?: number
  max?: number
  component?: any
  props?: Record<string, any>
}

interface Props {
  modelValue: any[]
  itemSchema: ItemSchema
}

interface Emits {
  (e: 'update:modelValue', value: any[]): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  itemSchema: () => ({})
})

const emit = defineEmits<Emits>()

const updateItem = (index: number, value: any) => {
  const newValue = [...props.modelValue]
  newValue[index] = value
  emit('update:modelValue', newValue)
}

const addItem = () => {
  let defaultValue: any
  switch (props.itemSchema.type) {
    case 'string':
      defaultValue = ''
      break
    case 'number':
      defaultValue = props.itemSchema.min ?? 0
      break
    case 'boolean':
      defaultValue = false
      break
    default:
      defaultValue = null
  }

  const newValue = [...props.modelValue]
  newValue.push(defaultValue)
  emit('update:modelValue', newValue)
}

const removeItem = (index: number) => {
  const newValue = [...props.modelValue]
  newValue.splice(index, 1)
  emit('update:modelValue', newValue)
}
</script>

<style scoped>
.array-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.array-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.remove-btn {
  margin-left: 10px;
}
</style>
