<template>
  <div class="task-node-config">
    <el-form label-position="top">
      <el-form-item label="描述">
        <el-input
          v-model="node.data.description"
          type="textarea"
          placeholder="输入任务描述"
          :rows="3"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="node.data.status" placeholder="选择状态">
          <el-option label="待处理" value="pending" />
          <el-option label="进行中" value="processing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item label="负责人">
        <el-input v-model="node.data.assignee" placeholder="输入负责人" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Node } from '@vue-flow/core'

interface Props {
  node: Node
}

const props = defineProps<Props>()

// 定义 emits
const emit = defineEmits<{
  update: [node: Node]
}>()

// 监听节点数据变化并发出更新事件
watch(() => props.node, (newNode) => {
  emit('update', newNode)
}, { deep: true })
</script>

<style scoped>
.task-node-config {
  padding: 10px 0;
}
</style>