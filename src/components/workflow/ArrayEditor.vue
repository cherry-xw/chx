<template>
  <div class="array-editor">
    <div v-for="(item, index) in modelValue" :key="index" class="array-item">
      <el-input
        v-if="itemSchema.type === 'string'"
        v-model="modelValue[index]"
        :placeholder="itemSchema.placeholder || ''"
      />
      <el-input-number
        v-else-if="itemSchema.type === 'number'"
        v-model="modelValue[index]"
        :min="itemSchema.min"
        :max="itemSchema.max"
      />
      <el-switch
        v-else-if="itemSchema.type === 'boolean'"
        v-model="modelValue[index]"
      />
      <component
        v-else-if="itemSchema.component"
        :is="itemSchema.component"
        v-model="modelValue[index]"
        v-bind="itemSchema.props"
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