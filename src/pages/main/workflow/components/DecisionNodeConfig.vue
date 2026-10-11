<template>
  <div class="decision-node-config">
    <el-form label-position="top">
      <el-form-item label="条件表达式">
        <el-input
          v-model="node.data.condition"
          type="textarea"
          placeholder="输入条件表达式"
          :rows="2"
        />
      </el-form-item>
      <el-form-item label="分支选项">
        <div class="outcome-list">
          <div
            v-for="(outcome, index) in node.data.outcomes || []"
            :key="index"
            class="outcome-item"
          >
            <el-input
              v-model="node.data.outcomes[index]"
              placeholder="输入分支名称"
            />
            <el-button
              type="danger"
              size="small"
              @click="removeOutcome(Number(index))"
              icon="Delete"
            />
          </div>
          <el-button @click="addOutcome" type="primary" size="small">
            添加分支
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { Node } from '@vue-flow/core'

interface Props {
  node: Node
}

const props = defineProps<Props>()

// 定义 emits
const emit = defineEmits<{
  update: [node: Node]
}>()

// 初始化 outcomes 数组
if (!props.node.data.outcomes) {
  props.node.data.outcomes = []
}

// 添加分支
const addOutcome = () => {
  if (!props.node.data.outcomes) {
    props.node.data.outcomes = []
  }
  props.node.data.outcomes.push('')
}

// 移除分支
const removeOutcome = (index: number) => {
  if (props.node.data.outcomes) {
    props.node.data.outcomes.splice(index, 1)
  }
}

// 监听节点数据变化并发出更新事件
watch(() => props.node, (newNode) => {
  emit('update', newNode)
}, { deep: true })
</script>

<style scoped>
.decision-node-config {
  padding: 10px 0;
}

.outcome-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.outcome-item {
  display: flex;
  gap: 5px;
  align-items: center;
}
</style>